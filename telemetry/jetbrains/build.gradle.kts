import org.gradle.jvm.tasks.Jar

val jacksonVersion = "2.10.0"
val junitVersion = "4.13"

plugins {
    kotlin("jvm") version "1.3.61"
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
        dependsOn(":copyTelemetryResources")
        kotlinOptions.jvmTarget = "1.8"
    }
    compileTestKotlin {
        kotlinOptions.jvmTarget = "1.8"
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
