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
    IdentifierDecorator,
    OneToManyDecorator
} from "@plumier/core"
import { ValidatorDecorator, PartialValidator } from "typedconverter"
import { InversePropertyDecorator } from 'core/src/generic-controller'

const isRequired = (dec: ApiRequiredDecorator): dec is ApiRequiredDecorator => dec.kind === "ApiRequired"
const isBind = (dec: BindingDecorator): dec is BindingDecorator => dec.type === "ParameterBinding"
const isName = (dec: ApiFieldNameDecorator): dec is ApiFieldNameDecorator => dec.kind === "ApiFieldName"
const isDescription = (dec: ApiDescriptionDecorator): dec is ApiDescriptionDecorator => dec.kind === "ApiDescription"
const isResponse = (dec: ApiResponseDecorator): dec is ApiResponseDecorator => dec.kind === "ApiResponse"
const isEnums = (dec: ApiEnumDecorator): dec is ApiEnumDecorator => dec.kind === "ApiEnum"
const isTag = (dec: ApiTagDecorator): dec is ApiTagDecorator => dec.kind === "ApiTag"
const isPartialValidator = (x: ValidatorDecorator) => x.type === "tc:validator" && x.validator === PartialValidator
const isGenericId = (x: IdentifierDecorator) => x.kind === "GenericDecoratorId"
const isOneToMany = (x: OneToManyDecorator) => x.kind === "GenericDecoratorOneToMany"
const isInverseProperty = (x: InversePropertyDecorator) => x.kind === "GenericInverseProperty"

interface TransformContext {
    map: Map<Class, string>
    config: Configuration
}

export {
    isRequired, isBind, isName, isDescription, isResponse, isEnums, isTag,
    isPartialValidator, TransformContext, isGenericId, 
    isOneToMany, isInverseProperty
}