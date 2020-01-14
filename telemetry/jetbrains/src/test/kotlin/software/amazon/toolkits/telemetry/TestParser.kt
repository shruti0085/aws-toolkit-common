// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

package software.amazon.toolkits.telemetry

import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test

class TestParser {
    @Test
    fun validateTypeMissingDescriptionT() {
        assertThatThrownBy {
            TelemetryParser.parseFiles(
                listOf(), ResourceLoader.SCHEMA_FILE,
                """
            {
                "types": [
                    {
                        "name": "result",
                        "allowedValues": ["Succeeded", "Failed", "Cancelled"],
                    }
                ],
                "metrics": []
            }
            """.trimIndent()
            )
        }.hasMessageContaining("required key [description] not found")
    }

    @Test
    fun validateMissingMetrics() {
        assertThatThrownBy {
            TelemetryParser.parseFiles(listOf(), ResourceLoader.SCHEMA_FILE, """{"types": []}""")
        }.hasMessageContaining("required key [metrics] not found")
    }

    @Test
    fun validateDataTypes() {

    }

    @Test
    fun successfulParse() {

    }
}
