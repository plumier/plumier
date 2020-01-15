import { decorate, mergeDecorator } from "tinspector"
import * as tc from "typedconverter"

import { AsyncValidatorResult, CustomValidator, CustomValidatorFunction, ValidatorDecorator } from "./types"


declare module "typedconverter" {
    namespace val {
        export function custom(validator: CustomValidatorFunction): (...arg: any[]) => void
        export function custom(validator: CustomValidator): (...arg: any[]) => void
        export function custom(id: string): (...arg: any[]) => void
        export function custom(id: symbol): (...arg: any[]) => void
        export function custom(val: CustomValidatorFunction | string | symbol | CustomValidator): (...arg: any[]) => void
        export function custom(...validators: (CustomValidatorFunction | string | symbol | CustomValidator)[]): (...arg: any[]) => void
        export function result(path: string, messages: string | string[]): AsyncValidatorResult[]
        export function enums(opt: { enums: string[], message?: string }): (...arg: any[]) => void
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
    return tc.val.custom(x => {
        if (!opt.enums.some(y => x === y))
            return opt.message || `Value must be one of ${opt.enums.join(", ")}`
    })
}
