# Telemetry

`telemetry` contains code generators and definitions files to generate telemetry calls for the various
AWS Toolkits.

## Package Overview

The telemetry package provides a unified, cross-IDE telemetry generation system for AWS Toolkits. Below is a summary of what the package includes and how it is structured.

### Structure

| Directory | Purpose |
|-----------|---------|
| `definitions/` | JSON telemetry definition files (shared across all IDEs) |
| `vscode/` | VS Code-specific code generator |
| `jetbrains/` | JetBrains (Kotlin/Gradle) code generator |
| `csharp/` | C# code generator and event library |
| `design/` | Design documents and rationale |

### Key Features

- **Declarative definitions** — Telemetry events are defined in JSON, making them easy to review and extend without touching generator code.
- **Multi-IDE code generation** — A single set of definitions produces type-safe telemetry calls for VS Code (TypeScript), JetBrains (Kotlin), and Visual Studio (C#).
- **JSON Schema validation** — A schema file (`telemetrySchema.json`) enables in-editor feedback while authoring definitions.
- **Strongly-typed metadata** — Generated code enforces allowed values and types at compile time, reducing runtime errors.
- **Extensible format** — New metadata types and metrics can be added by editing JSON; generators handle the rest.

### Supported Platforms

| Platform | Language | Generator |
|----------|----------|-----------|
| VS Code | TypeScript | Node.js script |
| JetBrains IDEs | Kotlin | Gradle plugin |
| Visual Studio | C# | .NET console app |

### How It Works

1. Authors define telemetry types and metrics in JSON files under `definitions/`.
2. Platform-specific generators read those definitions and produce source code with type-safe recording functions.
3. Toolkit codebases consume the generated output and call the recording functions at instrumentation points.

This approach keeps telemetry consistent across all AWS Toolkit variants while allowing each IDE plugin to use idiomatic patterns.

## Adding Telemetry

### Where to Edit

#### VS Code

For prototyping telemetry, modify the `src/shared/telemetry/vscodeTelemetry.json` inside the toolkit repository.

Make changes in that file, then from the AWS Toolkit repo root run:

`npm run generateTelemetry`

To update the generated output. When you are satisfied with generated telemetry, move
the definitions you just added to the appropriate file in `definitions` in this repo.

#### JetBrains

By using Gradle composite builds, we can prototype telemetry for the JetBrains toolkit directly in this repository.

Make changes to the appropriate file in `definitions` in this repository, then from the toolkit directory run:

`./gradlew generateTelemetry --include-build <path/to/aws-toolkit-common>/telemetry/jetbrains`

Your changes should then be reflected in the generated output.

### How to Edit

The easiest way to edit telemetry is to copy existing telemetry and change the values. For example,
to add a piece of metadata that is best represented by a string based enum, take an existing type:

```json
{
    "name": "schemaLanguage",
    "type": "string",
    "allowedValues": ["Java8", "Python36", "TypeScript3"],
    "description": "Languages targeted by the schemas service"
}
```

and change `name`, `description`, and the values in `allowedValues`

```json
{
    "name": "veryImportantInformation",
    "type": "string",
    "allowedValues": ["yes", "no", "maybe"],
    "description": "This description is generated into doc comments so make it count"
}
```

Then rerun the generator. This example will generate a new type that can be imported or used in telemetry calls.

### Editing in IDE

The telemetry format comes with a json schema document [here](telemetrySchema.json) that can be loaded
into the IDE while editing the documents. This will give you feedback as you edit.

-   [VS Code Instructions](https://code.visualstudio.com/docs/languages/json#_mapping-to-a-schema-in-the-workspace)
-   [JetBrains Instructions](https://www.jetbrains.com/help/idea/json.html#ws_json_schema_add_custom)

### Format Specification

See the [telemetry format document](telemetryformat.md) for complete format specification, or the
[json schema](telemetrySchema.json)

## Consuming Generators

For specifics on how to consume the generators, see each IDE specific doc:

-   [vscode](vscode/README.md)
-   [jetbrains](jetbrains/README.md)
-   [C#](csharp/README.md)
