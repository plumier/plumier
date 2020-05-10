import { ApiRequiredDecorator, Class, Configuration, BindingDecorator, ApiFieldNameDecorator, ApiDescriptionDecorator, ApiResponseDecorator, ApiEnumDecorator } from "@plumier/core"

const isRequired = (dec: ApiRequiredDecorator): dec is ApiRequiredDecorator => dec.kind === "ApiRequired"
const isBind = (dec: BindingDecorator): dec is BindingDecorator => dec.type === "ParameterBinding"
const isName = (dec: ApiFieldNameDecorator): dec is ApiFieldNameDecorator => dec.kind === "ApiFieldName"
const isDescription = (dec: ApiDescriptionDecorator): dec is ApiDescriptionDecorator => dec.kind === "ApiDescription"
const isResponse = (dec: ApiResponseDecorator): dec is ApiResponseDecorator => dec.kind === "ApiResponse"
const isEnums = (dec: ApiEnumDecorator): dec is ApiEnumDecorator => dec.kind === "ApiEnum"

interface TransformContext {
    map: Map<Class, string>
    config: Configuration
}

export { isRequired, isBind, isName, isDescription, isResponse, isEnums, TransformContext }