import com.squareup.kotlinpoet.ClassName
import com.squareup.kotlinpoet.CodeBlock
import com.squareup.kotlinpoet.FileSpec
import com.squareup.kotlinpoet.FunSpec
import com.squareup.kotlinpoet.MemberName
import com.squareup.kotlinpoet.ParameterSpec
import com.squareup.kotlinpoet.TypeSpec

val PACKAGE_NAME = "software.amazon.toolkits.telemetry"

fun String.filterInvalidCharacters() = this.replace(".", "")

fun String.snakeCaseToCamelCase() =
    this.split('_').map {
        it.toLowerCase().capitalize()
    }.joinToString("")

fun addImports(output: FileSpec.Builder) {
    // output.addImport("software.aws.toolkits.jetbrains.services", "telemetry")
}

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
                enumValue.toString().toUpperCase().filterInvalidCharacters(), TypeSpec.anonymousClassBuilder()
                    .addSuperclassConstructorParameter("%S", enumValue.toString())
                    .build()
            )
        }
        output.addType(enum.build())
    }
}

fun generateRecordFunctions(output: FileSpec.Builder, items: TelemetryDefinition) {
    items.metrics.forEach {
        val functionBuilder = FunSpec.builder("record${it.name.snakeCaseToCamelCase()}")
        // generate parameters
        val projectParameter = ClassName("com.intellij.openapi.project", "Project").copy(nullable = true)
        val valueParameter = com.squareup.kotlinpoet.DOUBLE.copy(nullable = true)
        val additionalParameters = it.metadata?.map { metadata ->
            val telemetryMetricType =
                items.types.find { it.name == metadata.type } ?: throw IllegalStateException("Type ${metadata.type} on ${it.name} not found in types!")
            val typeName = if (telemetryMetricType.allowedValues != null) {
                ClassName(PACKAGE_NAME, telemetryMetricType.name.filterInvalidCharacters())
            } else {
                telemetryMetricType.type?.getTypeFromType() ?: com.squareup.kotlinpoet.STRING
            }.copy(nullable = metadata.required ?: false)
            ParameterSpec(telemetryMetricType.name.filterInvalidCharacters(), typeName)
        } ?: listOf()
        functionBuilder
            .addParameter("project", projectParameter)
            .addParameter(ParameterSpec.builder("value", valueParameter).defaultValue("1.0").build())
            .addParameters(additionalParameters)
        // generate body
        val unit = MemberName("software.amazon.awssdk.services.toolkittelemetry.model", "Unit")
        val bodyCodeBlock = CodeBlock.builder()
            .add("unit(%M.${(it.unit ?: MetricUnit.NONE).name})\n", unit)
            .add("value(value)\n")
        it.metadata?.forEach {
            bodyCodeBlock.add("metadata(%S, %L.toString())\n", it.type, it.type)
        }
        functionBuilder.addStatement("TelemetryService.getInstance().record(project) { datum(%S) { %L } }", it.name, bodyCodeBlock.build())

        output.addFunction(functionBuilder.build())
    }
}

fun main(vararg args: String) {
    val telemetry = parse()
    val output = FileSpec.builder(PACKAGE_NAME, "HelloWorld")
    addImports(output)
    generateTelemetryEnumTypes(output, telemetry.types)
    generateRecordFunctions(output, telemetry)
    output.build().writeTo(System.out)
}
