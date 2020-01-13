import org.everit.json.schema.Schema
import org.everit.json.schema.loader.SchemaLoader
import org.gradle.jvm.tasks.Jar
import org.json.JSONObject

val jacksonVersion = "2.10.0"
val junitVersion = "4.13"

plugins {
    kotlin("jvm") version "1.3.61"
}

buildscript {
    repositories {
        mavenCentral()
        maven { setUrl("https://jitpack.io") }
    }
    dependencies {
        "classpath"(group = "com.github.everit-org.json-schema", name = "org.everit.json.schema", version = "1.12.1")
    }
}

group = "software.aws.toolkits.telemetry"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
    maven { setUrl("https://jitpack.io") }
}

dependencies {
    implementation(kotlin("stdlib-jdk8"))
    implementation("com.squareup:kotlinpoet:1.5.0")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:$jacksonVersion")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-xml:$jacksonVersion")
    implementation("com.github.everit-org.json-schema:org.everit.json.schema:1.12.1")
    testImplementation("junit:junit:$junitVersion")
}

tasks {
    compileKotlin {
        dependsOn(":copyTelemetryResources", ":validatePackagedSchema")
        kotlinOptions.jvmTarget = "1.8"
    }
    compileTestKotlin {
        kotlinOptions.jvmTarget = "1.8"
    }
}

tasks.register("validatePackagedSchema") {
    group = "build"
    description = "Validates that the packaged definition is compatable with the packaged schema"
    doFirst {
        try {
            val rawSchema = JSONObject(org.json.JSONTokener(File("src/main/resources/telemetrySchema.json").readText()))
            val schema: Schema = SchemaLoader.load(rawSchema)
            schema.validate(JSONObject(File("src/main/resources/telemetryDefinitions.json").readText()))
        } catch (e: Exception) {
            println("Exception while validating packaged schema, ${e.printStackTrace()}")
        }
    }
}

tasks.withType(Jar::class) {
    manifest {
        attributes["Main-Class"] = "software.amazon.toolkits.telemetry.TelemetryGeneratorMain"
    }
    // Package in runtime dependencies
    from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) })
}

task(name = "copyTelemetryResources", type = Copy::class) {
    doFirst {
        mkdir("src/main/resources")
    }
    from("..") {
        include("*.json")
    }
    into("src/main/resources")
}