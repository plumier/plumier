import { Context } from "koa"
import { TypeDecorator } from "tinspector"
import { ConversionMessage, ConversionResult, ConverterInvocation } from "typedconverter"

import { RouteInfo, ValidatorFunction, ValidatorInfo, ValidatorStore } from "../types"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

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
        ctx: Context,
        route: RouteInfo
    }

    interface ConverterOption {
        ctx: Context,
        route: RouteInfo
    }
}

/* ------------------------------------------------------------------------------- */
/* ---------------------------------- HELPERS ------------------------------------ */
/* ------------------------------------------------------------------------------- */

function isOptional(invocation: ConverterInvocation) {
    return invocation.decorators
        .some((x: ValidatorDecorator) => x.type === "ValidatorDecorator" && x.validator === ValidatorId.optional)
}

function isPartial(invocation: ConverterInvocation) {
    return invocation.parent && invocation.parent.decorators.some((x: TypeDecorator) => x.kind === "Override" && x.info === "Partial")
}

function isSkip(invocation: ConverterInvocation) {
    return invocation.decorators
        .some((x: ValidatorDecorator) => x.type === "ValidatorDecorator" && x.validator === ValidatorId.skip)
}

async function validate(value: any, { decorators, ctx, parent, name }: ConverterInvocation, validators: ValidatorStore) {
    const promised: Promise<string | undefined>[] = []
    for (const dec of (decorators as ValidatorDecorator[])) {
        if (dec.type === "ValidatorDecorator" && dec.validator !== ValidatorId.optional) {
            const info: ValidatorInfo = { route: ctx.route!, parent, ctx, name }
            const result = typeof dec.validator === "string" ? validators[dec.validator](value, info) : dec.validator(value, info)
            promised.push(result)
        }
    }
    const result = await Promise.all(promised)
    return result.filter((x): x is string => !!x)
}

export async function validatorVisitor(value: {} | undefined, invocation: ConverterInvocation): Promise<ConversionResult> {
    if ((isPartial(invocation) || isOptional(invocation)) && (value === undefined || value === null))
        return new ConversionResult(undefined)
    const nextResult = await invocation.proceed()
    if (isSkip(invocation)) return nextResult
    if (value === undefined || value === null)
        return nextResult.merge(new ConversionMessage(invocation.path, `${invocation.path.join(".")} is required`))
    const messages = await validate(value, invocation, invocation.ctx && invocation.ctx.config.validators!)
    return messages.reduce((a, b) => a.merge(new ConversionMessage(invocation.path, b)), nextResult)
}
