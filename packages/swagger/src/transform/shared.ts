import {
    ApiDescriptionDecorator,
    ApiEnumDecorator,
    ApiFieldNameDecorator,
    ApiRequiredDecorator,
    ApiResponseDecorator,
    ApiTagDecorator,
    BindingDecorator,
    Class,
    Configuration,
    ApiReadOnlyDecorator,
    ApiWriteOnlyDecorator,
    EntityIdDecorator,
    RouteInfo,
    RelationDecorator,
} from "@plumier/core"
import { ValidatorDecorator, PartialValidator } from "typedconverter"

const isRequired = (dec: ApiRequiredDecorator): dec is ApiRequiredDecorator => dec.kind === "ApiRequired"
const isBind = (dec: BindingDecorator): dec is BindingDecorator => dec.type === "ParameterBinding"
const isName = (dec: ApiFieldNameDecorator): dec is ApiFieldNameDecorator => dec.kind === "ApiFieldName"
const isDescription = (dec: ApiDescriptionDecorator): dec is ApiDescriptionDecorator => dec.kind === "ApiDescription"
const isResponse = (dec: ApiResponseDecorator): dec is ApiResponseDecorator => dec.kind === "ApiResponse"
const isEnums = (dec: ApiEnumDecorator): dec is ApiEnumDecorator => dec.kind === "ApiEnum"
const isTag = (dec: ApiTagDecorator): dec is ApiTagDecorator => dec.kind === "ApiTag"
const isPartialValidator = (x: ValidatorDecorator) => x.type === "tc:validator" && x.validator === PartialValidator
const isGenericId = (x: EntityIdDecorator) => x.kind === "plumier-meta:entity-id"
const isApiReadOnly = (x: ApiReadOnlyDecorator) => x.kind === "ApiReadonly"
const isApiWriteOnly = (x: ApiWriteOnlyDecorator) => x.kind === "ApiWriteOnly"
const isRelation = (x: RelationDecorator): x is RelationDecorator => x.kind === "plumier-meta:relation"

interface BaseTransformContext {
    map: Map<Class, string>
    config: Configuration
}

interface TransformContext extends BaseTransformContext {
    route:RouteInfo
}


export {
    isRequired, isBind, isName, isDescription, isResponse, isEnums, isTag, isRelation,
    isPartialValidator, TransformContext, BaseTransformContext, isGenericId, isApiReadOnly, isApiWriteOnly
}