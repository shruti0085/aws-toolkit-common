import com.squareup.kotlinpoet.FileSpec
import com.squareup.kotlinpoet.FunSpec
import com.squareup.kotlinpoet.TypeSpec

fun generateTelemetryEnumTypes(output: FileSpec.Builder, items: List<TelemetryMetricType>) {
    items.forEach {
        if (it.allowedValues == null) {
            return@forEach
        }
        val enum = TypeSpec.enumBuilder(it.name)
            .primaryConstructor(
                FunSpec.constructorBuilder()
                    .addParameter("name", String::class)
                    .build()
            )
        it.allowedValues.forEach { enumValue ->
            enum.addEnumConstant(
                enumValue.toString().toUpperCase().replace(".", ""), TypeSpec.anonymousClassBuilder()
                    .addSuperclassConstructorParameter("%S", enumValue.toString())
                    .build()
            )
        }
        output.addType(enum.build())
    }
}

fun generateRecordFunctions(output: FileSpec.Builder, items: TelemetryDefinition) {
    items.metrics.forEach {
        
    }
}

fun main(vararg args: String) {
    val telemetry = parse()
    val output = FileSpec.builder("software.amazon.toolkits.telemetry", "HelloWorld")
    generateTelemetryEnumTypes(output, telemetry.types)
    generateRecordFunctions(output, telemetry)
    output.build().writeTo(System.out)
}
