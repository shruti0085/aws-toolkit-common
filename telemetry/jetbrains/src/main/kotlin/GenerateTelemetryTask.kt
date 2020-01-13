// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

package software.amazon.toolkits.telemetry

import org.gradle.api.DefaultTask
import org.gradle.api.tasks.InputFiles
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.TaskAction
import java.io.File

class GenerateTelemetryTask : DefaultTask() {
    @InputFiles
    lateinit var inputFiles: List<File>

    @OutputDirectory
    lateinit var outputDir: File

    @TaskAction
    fun generate() {
        println("Generating telemetry using packaged file and:\n ${inputFiles.map { it.absolutePath }.joinToString("\n")}")
        generateTelemetryFromFiles(inputFiles, outputDir)
    }
}
