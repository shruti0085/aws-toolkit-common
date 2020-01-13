// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

package software.amazon.toolkits.telemetry

import java.io.File

// This main is used for testing
object TelemetryGeneratorMain {
    @JvmStatic
    fun main(vararg args: String) {
        generateTelemetryFromFiles(listOf(), File("out"))
    }
}
