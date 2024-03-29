import {
    ApiDescriptionDecorator,
    ApiEnumDecorator,
    ApiFieldNameDecorator,
    ApiReadOnlyDecorator,
    ApiRequiredDecorator,
    ApiResponseDecorator,
    ApiTagDecorator,
    ApiWriteOnlyDecorator,
    BindingDecorator,
    Class,
    Configuration,
    RelationDecorator,
    RouteInfo,
} from "@plumier/core"
import reflect, { ClassReflection } from "@plumier/reflect"
import { PartialValidator, ValidatorDecorator } from "@plumier/validator"

const isRequired = (dec: ApiRequiredDecorator): dec is ApiRequiredDecorator => dec.kind === "ApiRequired"
const isBind = (dec: BindingDecorator): dec is BindingDecorator => dec.type === "ParameterBinding"
const isName = (dec: ApiFieldNameDecorator): dec is ApiFieldNameDecorator => dec.kind === "ApiFieldName"
const isDescription = (dec: ApiDescriptionDecorator): dec is ApiDescriptionDecorator => dec.kind === "ApiDescription"
const isResponse = (dec: ApiResponseDecorator): dec is ApiResponseDecorator => dec.kind === "ApiResponse"
const isEnums = (dec: ApiEnumDecorator): dec is ApiEnumDecorator => dec.kind === "ApiEnum"
const isTag = (dec: ApiTagDecorator): dec is ApiTagDecorator => dec.kind === "ApiTag"
const isPartialValidator = (x: ValidatorDecorator) => x.type === "tc:validator" && x.validator === PartialValidator
const isApiReadOnly = (x: ApiReadOnlyDecorator) => x.kind === "ApiReadonly"
const isApiWriteOnly = (x: ApiWriteOnlyDecorator) => x.kind === "ApiWriteOnly"
const isRelation = (x: RelationDecorator): x is RelationDecorator => x.kind === "plumier-meta:relation"

interface BaseTransformContext {
    map: Map<Class, string>
    config: Configuration
}

interface TransformContext extends BaseTransformContext {
    route: RouteInfo
}

function getMetadata(modelType: (Class | Class[])): ClassReflection {
    const type = Array.isArray(modelType) ? modelType[0] : modelType
    const defaultMetadata = { properties: [], methods: [], decorators: [] }
    return { ...defaultMetadata, ...reflect(type) }
}

export {
    isRequired, isBind, isName, isDescription, isResponse, isEnums, isTag, isRelation,
    isPartialValidator, TransformContext, BaseTransformContext, isApiReadOnly, isApiWriteOnly,
    getMetadata
}