import com.fasterxml.jackson.databind.ObjectMapper
import com.squareup.kotlinpoet.ClassName
import com.squareup.kotlinpoet.FileSpec
import com.squareup.kotlinpoet.FunSpec
import com.squareup.kotlinpoet.KModifier
import com.squareup.kotlinpoet.PropertySpec
import com.squareup.kotlinpoet.TypeSpec
import java.io.File
import kotlin.system.exitProcess

data class Type()

enum class MetricUnit(val type: String) {
    None("None"),
    Milliseconds("Milliseconds"),
    Bytes("Bytes"),
    Percent("Percent"),
    Count("Count")
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
    val types: List<Type>,
    val metrics: List<Metric>
)

fun parse(): TelemetryDefinition {
    // TODO validate schema using json schema
    try {
        val mapper = ObjectMapper()
        return mapper.readValue(File("c:\\test\\staff.json"), TelemetryDefinition::class.java)
    } catch (e: Exception) {
        System.err.println("Error while parsing: $e")
        exitProcess(-1)
    }
}

fun main(vararg args: String) {
    parse()
    val greeterClass = ClassName("", "Greeter")
    val file = FileSpec.builder("", "HelloWorld")
        .addType(
            TypeSpec.classBuilder("Greeter")
            .primaryConstructor(
                FunSpec.constructorBuilder()
                .addParameter("name", String::class)
                .build())
            .addProperty(
                PropertySpec.builder("name", String::class)
                .initializer("name")
                .build())
            .addFunction(FunSpec.builder("greet")
                .addStatement("println(%P)", "Hello, \$name")
                .build())
            .build())
        .addFunction(FunSpec.builder("main")
            .addParameter("args", String::class, KModifier.VARARG)
            .addStatement("%T(args[0]).greet()", greeterClass)
            .build())
        .build()

    file.writeTo(System.out)
}
