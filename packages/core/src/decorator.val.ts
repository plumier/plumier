import { decorate, mergeDecorator, CustomPropertyDecorator } from "tinspector"
import * as tc from "typedconverter"

import { AsyncValidatorResult, CustomValidator, CustomValidatorFunction, ValidatorDecorator } from "./types"
import { api } from './decorator.api'


declare module "typedconverter" {
    namespace val {
        export function custom(validator: CustomValidatorFunction): (...args:any[]) => void
        export function custom(validator: CustomValidator): (...args:any[]) => void
        export function custom(id: string): (...args:any[]) => void
        export function custom(id: symbol): (...args:any[]) => void
        export function custom(val: CustomValidatorFunction | string | symbol | CustomValidator): (...args:any[]) => void
        export function custom(...validators: (CustomValidatorFunction | string | symbol | CustomValidator)[]): (...args:any[]) => void
        export function result(path: string, messages: string | string[]): AsyncValidatorResult[]
        export function enums(opt: { enums: string[], message?: string }): (...args:any[]) => void
    }
}

tc.val.custom = (...val: (CustomValidatorFunction | string | symbol | CustomValidator)[]) => {
    return mergeDecorator(...val.map(x => decorate(<ValidatorDecorator>{ type: "ValidatorDecorator", validator: x }, ["Class", "Property", "Parameter"])))
}

tc.val.result = (a: string, b: string | string[]) => {
    if (Array.isArray(b)) return [{ path: a, messages: b }]
    else return [{ path: a, messages: [b] }]
}

tc.val.enums = (opt) => {
    return mergeDecorator(tc.val.custom(x => {
        if (!opt.enums.some(y => x === y))
            return opt.message || `Value must be one of ${opt.enums.join(", ")}`
    }), api.params.enums(...opt.enums))
}

const originalRequired = tc.val.required
tc.val.required = (): CustomPropertyDecorator => {
    return mergeDecorator(originalRequired(), api.params.required())
}