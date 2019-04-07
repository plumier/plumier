import { Context } from "koa"
import { decorateProperty, reflect } from "tinspector"
import { ConversionMessage, ConversionResult, ConverterInvocation } from "typedconverter"
import Validator from "validator"

import { Class } from "./common"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

export type ValidatorFunction = (value: string, ctx: Context) => Promise<string | undefined>
export type ValidatorStore = { [key: string]: ValidatorFunction }
export interface Opt { message?: string }

export enum ValidatorId {
    optional = "internal:optional",
    skip = "internal:skip"
}


export interface ValidatorDecorator {
    type: "ValidatorDecorator",
    validator: ValidatorFunction | string,
}

export interface ValidationIssue {
    path: string[]
    messages: string[]
}

declare module "typedconverter" {
    interface ConverterInvocation {
        ctx: Context
    }

    interface ConverterOption {
        ctx: Context
    }
}

/* ------------------------------------------------------------------------------- */
/* ---------------------------------- HELPERS ------------------------------------ */
/* ------------------------------------------------------------------------------- */

function isOptional(invocation: ConverterInvocation) {
    return invocation.decorators
        .some((x: ValidatorDecorator) => x.type === "ValidatorDecorator" && x.validator === ValidatorId.optional)
}

function isSkip(invocation: ConverterInvocation) {
    return invocation.decorators
        .some((x: ValidatorDecorator) => x.type === "ValidatorDecorator" && x.validator === ValidatorId.skip)
}

async function validate(value: any, { decorators, ctx }: ConverterInvocation, validators: ValidatorStore) {
    const promised: Promise<string | undefined>[] = []
    for (const dec of (decorators as ValidatorDecorator[])) {
        if (dec.type === "ValidatorDecorator" && dec.validator !== ValidatorId.optional) {
            const result = typeof dec.validator === "string" ? validators[dec.validator](value, ctx) : dec.validator(value, ctx)
            promised.push(result)
        }
    }
    const result = await Promise.all(promised)
    return result.filter((x): x is string => !!x)
}

export async function validatorVisitor(value: {} | undefined, invocation: ConverterInvocation): Promise<ConversionResult> {
    const nextResult = await invocation.proceed()
    if (isSkip(invocation)) return nextResult
    if (!isOptional(invocation) && (value === undefined || value === null)) {
        return nextResult.merge(new ConversionMessage(invocation.path, `${invocation.path.join(".")} is required`))
    }
    const messages = await validate(value, invocation, invocation.ctx && invocation.ctx.config.validators!)
    return messages.reduce((a, b) => a.merge(new ConversionMessage(invocation.path, b)), nextResult)
}
