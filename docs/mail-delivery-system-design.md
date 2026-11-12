# Email Delivery System Design

## Overview

This document describes the design of a transactional and bulk email delivery
system, comparable in scope to services such as Amazon SES, Postmark, or
SendGrid. The system accepts email send requests from authenticated tenants,
queues them durably, renders them from templates, and delivers them to
recipient mail servers while tracking delivery status, bounces, and complaints.

The primary goals are reliability (no accepted message is silently dropped),
good deliverability (messages reach the inbox, not spam), and horizontal
scalability for both low-latency transactional mail and high-volume bulk
campaigns.

### Purpose and scope

This document is intended to align engineers on the overall approach before
implementation begins. It covers:

- Functional and non-functional requirements
- The high-level architecture and core components (API layer, message queue,
  worker pool, SMTP delivery layer, and database)
- The hard parts of running an email system: deliverability, bounce and
  complaint handling, retries, idempotency, and rate limiting
- A sketch of the data model and a suggested starting stack
- Open questions and next steps

It is a design sketch, not a final specification. Detailed API schemas,
operational runbooks, and capacity planning are out of scope.

## Requirements

### Functional requirements

- Send **transactional** email (password resets, receipts, OTPs) with low
  latency.
- Send **marketing / bulk** email (campaigns, newsletters) at high throughput,
  with scheduling support.
- **Templates**: named, versioned templates with variable substitution for
  subject and body.
- **Attachments**: support MIME attachments up to a reasonable size limit.
- **Scheduling**: allow messages to be scheduled for future delivery.
- **Open and click tracking**: tracking pixels and rewritten links to record
  engagement events.
- **Bounce and complaint handling**: ingest provider feedback and maintain a
  suppression list.

### Non-functional requirements

- **Scale**: handle bursts of millions of messages per day; scale workers
  horizontally.
- **Latency**: transactional email should leave the system within a few seconds
  of acceptance under normal load. Bulk email may be rate-limited and spread
  over time.
- **Reliability**: **at-least-once** delivery. Every accepted message is
  persisted before acknowledgement, and retried on transient failure. Combined
  with idempotency keys, callers can safely retry without producing duplicate
  user-visible sends.
- **Multi-tenancy**: isolate quota, rate limits, templates, and suppression
  lists per tenant.

## High-Level Architecture

```
                +-------------------------------------------------+
                |                                                 |
  Client  --->  |  API Layer                                      |
  (HTTPS)       |  - authenticate (API key / token)               |
                |  - validate request & payload                   |
                |  - rate limit / quota check                     |
                |  - idempotency check (dedup)                    |
                |  - persist message (status = queued)            |
                +-----------------------+-------------------------+
                                        |
                                        v
                        +-------------------------------+
                        |  Message Queue                |
                        |  (Kafka / SQS / RabbitMQ)     |
                        +---------------+---------------+
                                        |
                                        v
                +-------------------------------------------------+
                |  Worker Pool                                    |
                |  - fetch template, render subject/body          |
                |  - apply suppression checks                     |
                |  - build MIME, inject tracking                  |
                |  - send via delivery layer                      |
                +-----------------------+-------------------------+
                                        |
                                        v
                        +-------------------------------+
                        |  Delivery / SMTP Layer        |
                        |  (SES / Postmark / MX / MTA)  |
                        +---------------+---------------+
                                        |
             status + bounce/complaint  |  feedback (webhooks / SNS)
                                        v
                        +-------------------------------+
                        |  Database (metadata, status)  |
                        |  + events, suppressions       |
                        +-------------------------------+
```

The data flow is: **Client -> API Layer -> Queue -> Workers -> Delivery
Provider**. Status updates (accepted, sent, bounced, complained, delivered)
flow back from the delivery layer into the database so callers can query the
state of any message.

## Core Components

### API Layer

- Terminates HTTPS behind a load balancer.
- **Authenticates** each request (API key or bearer token) and resolves the
  tenant.
- **Validates** the request body: recipient addresses, template reference,
  attachment size, payload schema.
- Enforces **rate limits and quotas** per tenant and per recipient domain.
- Performs the **idempotency check** using the client-supplied idempotency key.
- Persists the message to the database with status `queued` **before**
  enqueuing, so no accepted message can be lost, then publishes a job to the
  queue and returns a message ID.

### Message Queue

- Durable buffer that decouples ingestion from delivery and absorbs bursts.
- Enables independent horizontal scaling of workers.
- Supports separate queues or priorities for transactional vs bulk traffic so
  that a large campaign cannot starve latency-sensitive transactional mail.
- Candidates: **Kafka** (high throughput, replayable log), **SQS** (managed,
  simple), or **RabbitMQ** (flexible routing).

### Worker Pool

- Consumes jobs from the queue.
- Loads the referenced **template version** and renders subject and body with
  the provided variables.
- Checks the **suppression list** and drops/records messages to suppressed
  addresses.
- Builds the MIME message, attaches files, and injects **open/click tracking**.
- Hands the message to the delivery layer and records the outcome.
- Stateless and horizontally scalable; concurrency is tuned against provider
  and per-domain throttles.

### Delivery / SMTP Layer

- Sends the rendered message to the recipient's mail infrastructure, either
  through a managed provider (SES, Postmark) or a self-hosted MTA talking SMTP
  to recipient MX servers.
- Manages sending IPs, connection pooling, and per-domain concurrency.
- Receives delivery receipts, bounces, and complaints and routes them back to
  update message status and the suppression list.

### Database

- Stores message metadata and current status, per-message event history,
  suppression entries, and templates (see the data model below).

## The Hard Parts

### Deliverability

Reaching the inbox is the central challenge. Key measures:

- **SPF**: publish DNS records authorizing the sending IPs for each sending
  domain.
- **DKIM**: cryptographically sign outbound messages so receivers can verify
  the domain and that the body was not altered.
- **DMARC**: publish a policy aligning SPF/DKIM and instruct receivers how to
  handle failures; collect aggregate reports.
- **IP warm-up**: gradually ramp volume on new sending IPs so receivers build
  trust instead of flagging a sudden spike as spam.
- **Reputation management**: monitor bounce and complaint rates, segment
  transactional and marketing traffic onto different IP pools, and keep lists
  clean.

### Bounce and Complaint Handling

- Ingest asynchronous feedback (webhooks, SNS notifications, or SMTP DSNs).
- Distinguish **hard bounces** (permanent, e.g. unknown mailbox) from **soft
  bounces** (transient, e.g. mailbox full).
- On hard bounce or spam complaint, add the address to the **suppression list**
  so future sends to it are blocked automatically. This protects sender
  reputation.
- Record every bounce/complaint as an event for reporting.

### Retries

- **Transient failures (4xx / soft bounces)**: retry with **exponential
  backoff** (and jitter) up to a bounded number of attempts.
- **Permanent failures (5xx / hard bounces)**: do not retry. Move the job to a
  **dead-letter queue (DLQ)** for inspection and mark the message failed.
- Retry state is tracked so the same message is not retried indefinitely.

### Idempotency

- Clients supply an **idempotency key** with each send request.
- The API layer stores keys (e.g. in Redis and/or a unique DB constraint). A
  repeated key returns the original message ID instead of enqueuing a duplicate.
- This lets clients retry safely over an unreliable network while keeping
  at-least-once delivery from becoming user-visible duplicates.

### Rate Limiting and Throttling

- Enforce per-tenant quotas and global limits at the API layer.
- Throttle delivery **per recipient domain** since large receivers (Gmail,
  Outlook, Yahoo) impose their own connection and volume limits; exceeding them
  causes deferrals or blocks.
- Use a shared store (Redis) for distributed counters across API and worker
  instances.

## Data Model Sketch

### `messages`

| Column            | Type        | Notes                                      |
| ----------------- | ----------- | ------------------------------------------ |
| `id`              | UUID / PK   | Message identifier                         |
| `tenant_id`       | UUID / FK   | Owning tenant                              |
| `to`             | text        | Recipient address                          |
| `from`           | text        | Sender address                             |
| `template_id`     | UUID / FK   | Template used                              |
| `status`          | enum        | queued, sending, sent, bounced, failed     |
| `idempotency_key` | text        | Unique per tenant for dedup                |
| `created_at`      | timestamptz | Creation time                              |

### `events`

| Column       | Type        | Notes                                           |
| ------------ | ----------- | ----------------------------------------------- |
| `message_id` | UUID / FK   | References `messages.id`                        |
| `type`       | enum        | queued, sent, delivered, open, click, bounce, complaint |
| `timestamp`  | timestamptz | When the event occurred                         |

### `suppressions`

| Column   | Type | Notes                                      |
| -------- | ---- | ------------------------------------------ |
| `email`  | text | Suppressed address (indexed/unique)        |
| `reason` | enum | hard_bounce, complaint, manual, unsubscribe |

### `templates`

| Column      | Type      | Notes                          |
| ----------- | --------- | ------------------------------ |
| `id`        | UUID / PK | Template identifier            |
| `tenant_id` | UUID / FK | Owning tenant                  |
| `subject`   | text      | Subject template               |
| `body`      | text      | Body template (HTML/text)      |
| `version`   | integer   | Version number for the template |

## Suggested Starting Stack

- **API**: a service in **Node.js, Go, or Python** behind a load balancer.
- **Queue**: **SQS** or **RabbitMQ** to start (managed/simple); consider Kafka
  if replay and very high throughput become requirements.
- **Database**: **PostgreSQL** for message metadata, events, suppressions, and
  templates; **Redis** for rate limiting and idempotency/dedup.
- **Delivery**: start with **Amazon SES** or **Postmark** to inherit their IP
  reputation and feedback loops; build a **custom MTA** only if volume and cost
  justify the operational burden.

## Open Questions

- Do we need per-tenant dedicated IP pools from day one, or shared pools with
  later migration?
- What are the attachment size and total payload limits?
- How long should message bodies and events be retained for compliance and
  debugging?
- Which engagement events (opens, clicks) are required for the first release?

## Next Steps

1. Finalize the public API contract (send, status lookup, template CRUD).
2. Define the database schema and migrations from the sketch above.
3. Stand up the API -> queue -> worker path against SES in a sandbox.
4. Implement bounce/complaint ingestion and the suppression list.
5. Add idempotency, retries with backoff, and the dead-letter queue.
6. Add per-domain throttling and observability (metrics, dashboards, alerts).
