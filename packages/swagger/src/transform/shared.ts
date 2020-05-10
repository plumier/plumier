import { Class, Configuration } from "@plumier/core"
import { RequiredValidator, ValidatorDecorator } from "typedconverter"

const isRequired = (dec: ValidatorDecorator): dec is ValidatorDecorator => dec.type === "tc:validator" && dec.validator === RequiredValidator

interface TransformContext {
    map: Map<Class, string>
    config: Configuration
}

export {isRequired, TransformContext}