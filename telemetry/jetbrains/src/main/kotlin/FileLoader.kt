// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

package software.amazon.toolkits.telemetry

object FileLoader {
    private val schemaPath = "/telemetrySchema.json"
    private val definitionsPath = "/telemetryDefinitions.json"

    val SCHEMA_FILE = this.javaClass.getResourceAsStream(schemaPath).use {
        it.bufferedReader().readText()
    }
    val DEFINITONS_FILE = this.javaClass.getResourceAsStream(definitionsPath).use {
        it.bufferedReader().readText()
    }
}