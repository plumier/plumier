import { Context } from "koa"
import * as tc from "typedconverter"

import { Class } from "../common"
import { HttpStatus } from "../http-status"
import {
    ActionResult,
    Configuration,
    Invocation,
    Middleware,
    ValidatorDecorator,
    ValidatorFunction,
    ValidatorInfo,
} from "../types"
import { binder } from "./binder"
import { decorateProperty } from 'tinspector';

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //


interface AsyncValidatorItem {
    value: any,
    path: string,
    parent?: { type: Class, decorators: any[] }
    validator: ValidatorFunction
}

function createVisitor(items: AsyncValidatorItem[]) {
    return (i: tc.VisitorInvocation) => {
        const result = i.proceed();
        const decorators: ValidatorDecorator[] = i.decorators.filter((x: ValidatorDecorator) => x.type === "ValidatorDecorator")
        if (decorators.length > 0)
            items.push(...decorators.map(x => ({ value: i.value, path: i.path, parent: i.parent, validator: x.validator })))
        return result;
    }
}

declare module "typedconverter" {
    namespace val {
        export function custom(val: ValidatorFunction | string): (...arg: any[]) => void
    }
}

tc.val.custom = (val: ValidatorFunction | string) => {
    return decorateProperty(<ValidatorDecorator>{ type: "ValidatorDecorator", validator: val })
}

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

async function validate(ctx: Context): Promise<tc.Result> {
    const getName = (path: string) => path.indexOf(".") > -1 ? path.substring(path.lastIndexOf(".") + 1) : path
    const decsAsync: AsyncValidatorItem[] = []
    const visitors = [createVisitor(decsAsync), ...(ctx.config.typeConverterVisitors || [])]
    const result: any[] = []
    const issues: tc.ResultMessages[] = []
    //sync validations
    for (const parMeta of ctx.route!.action.parameters) {
        const rawParameter = binder(ctx, parMeta)
        const parValue = tc.validate(rawParameter, {
            decorators: parMeta.decorators, path: parMeta.name, type: parMeta.type || Object,
            visitors: visitors, guessArrayElement: !!ctx.is("urlencoded")
        })
        result.push(parValue.value)
        if (parValue.issues)
            issues.push(...parValue.issues)
    }
    //async validations
    if (decsAsync.length > 0) {
        const invalids = await Promise.all(decsAsync.map(async x => {
            const name = getName(x.path)
            const info: ValidatorInfo = { ctx, name, parent: x.parent, route: ctx.route! }
            if(x.value === undefined || x.value === null) return
            if (typeof x.validator === "function") {
                const messages = await x.validator(x.value, info)
                if (messages) return { path: x.path, messages: [messages] }
            }
            else {
                if (!ctx.config.validators) throw new Error("No validator store found in configuration")
                if (!ctx.config.validators[x.validator]) throw new Error(`No validation implementation found for ${x.validator}`)
                const messages = await ctx.config.validators[x.validator](x.value, info)
                if (messages) return { path: x.path, messages: [messages] }
            }
        }))
        for (const invalid of invalids) {
            if (invalid) {
                const msg = issues.find(x => x.path === invalid.path)
                if (msg) msg.messages.push(...invalid.messages)
                else issues.push(invalid)
            }
        }
    }
    return (issues.length > 0) ? { issues, value: undefined } : { value: result }
}


// --------------------------------------------------------------------- //
// ----------------------------- MIDDLEWARE ---------------------------- //
// --------------------------------------------------------------------- //

class ValidationMiddleware implements Middleware {
    constructor(private config: Configuration) { }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        const ctx = invocation.context;
        (ctx as any).config = this.config
        if (!ctx.route) return invocation.proceed();
        const result = await validate(invocation.context);
        if (result.issues)
            return new ActionResult(result.issues
                .map(x => ({ path: x.path.split("."), messages: x.messages })),
                HttpStatus.UnprocessableEntity);
        (ctx as any).parameters = result.value
        return invocation.proceed()
    }
}

export { ValidationMiddleware }