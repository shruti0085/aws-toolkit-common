package software.amazon.toolkits.telemetry

import com.fasterxml.jackson.annotation.JsonValue
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.squareup.kotlinpoet.TypeName
import java.io.File
import kotlin.system.exitProcess

enum class TypeTypes(@get:JsonValue val type: String) {
    STRING("string") {
        override fun getTypeFromType(): TypeName = com.squareup.kotlinpoet.STRING
    },
    INT("int") {
        override fun getTypeFromType(): TypeName = com.squareup.kotlinpoet.INT
    },
    DOUBLE("double") {
        override fun getTypeFromType(): TypeName = com.squareup.kotlinpoet.DOUBLE
    },
    BOOLEAN("boolean") {
        override fun getTypeFromType(): TypeName = com.squareup.kotlinpoet.BOOLEAN
    };

    abstract fun getTypeFromType(): TypeName
}

data class TelemetryMetricType(
    val name: String,
    val description: String,
    val type: TypeTypes?,
    val allowedValues: List<Any>?
)

data class MetricType(val telemetryMetricType: TelemetryMetricType, val require: Boolean)

enum class MetricUnit(@get:JsonValue val type: String) {
    NONE("None"),
    MILLISECONDS("Milliseconds"),
    BYTES("Bytes"),
    PERCENT("Percent"),
    COUNT("Count")
}

data class Metadata(
    val type: String,
    val required: Boolean?
)

data class Metric(
    val name: String,
    val description: String,
    val unit: MetricUnit?,
    val metadata: List<Metadata>?
)

data class TelemetryDefinition(
    val types: List<TelemetryMetricType>,
    val metrics: List<Metric>
)

fun parse(): TelemetryDefinition {
    // TODO validate schema using json schema
    try {
        val mapper = jacksonObjectMapper()
        return mapper.readValue(File("/Users/werlla/aws-toolkit-common/telemetry/telemetryDefinitions.json"))
    } catch (e: Exception) {
        System.err.println("Error while parsing: $e")
        exitProcess(-1)
    }
}
