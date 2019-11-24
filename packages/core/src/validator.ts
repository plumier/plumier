import { decorateProperty } from "tinspector"
import * as tc from "typedconverter"

import { binder } from "./binder"
import { Class, hasKeyOf } from "./common"
import {
    ActionResult,
    AsyncValidatorResult,
    Invocation,
    Middleware,
    RouteContext,
    ValidationError,
    ValidatorDecorator,
    ValidatorFunction,
    ValidatorInfo,
    CustomValidator,
} from "./types"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //


interface AsyncValidatorItem {
    value: any,
    path: string,
    parent?: { value: any, type: Class, decorators: any[] }
    validator: ValidatorFunction | string | symbol | CustomValidator
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
        export function custom(validator: ValidatorFunction): (...arg: any[]) => void
        export function custom(validator: CustomValidator): (...arg: any[]) => void
        export function custom(id: string): (...arg: any[]) => void
        export function custom(id: symbol): (...arg: any[]) => void
        export function custom(val: ValidatorFunction | string | symbol | CustomValidator): (...arg: any[]) => void
        export function result(path: string, messages: string | string[]): AsyncValidatorResult[]
    }
}

tc.val.custom = (val: ValidatorFunction | string | symbol | CustomValidator) => {
    return decorateProperty(<ValidatorDecorator>{ type: "ValidatorDecorator", validator: val })
}

tc.val.result = (a: string, b: string | string[]) => {
    if (Array.isArray(b)) return [{ path: a, messages: b }]
    else return [{ path: a, messages: [b] }]
}

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //
const getName = (path: string) => path.indexOf(".") > -1 ? path.substring(path.lastIndexOf(".") + 1) : path

async function validateAsync(x: AsyncValidatorItem, ctx: RouteContext): Promise<AsyncValidatorResult[]> {
    const name = getName(x.path)
    const info: ValidatorInfo = { ctx, name, parent: x.parent }
    if (x.value === undefined || x.value === null) return []
    let validator: CustomValidator;
    if (typeof x.validator === "function")
        validator = { validate: x.validator }
    else if (hasKeyOf<CustomValidator>(x.validator, "validate"))
        validator = x.validator
    else
        validator = ctx.config.dependencyResolver.resolve(x.validator)
    const message = await validator.validate(x.value, info)
    if (!message) return []
    if (typeof message === "string")
        return [{ path: x.path, messages: [message] }]
    return message.map(y => <AsyncValidatorResult>({
        path: `${x.path}.${y.path}`,
        messages: y.messages
    }))
}

async function validate(ctx: RouteContext): Promise<tc.Result> {
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
        const results = await Promise.all(decsAsync.map(async x => validateAsync(x, ctx)))
        for (const invalid of results.flatten()) {
            const msg = issues.find(x => x.path === invalid.path)
            if (msg) msg.messages.push(...invalid.messages)
            else issues.push(invalid)
        }
    }
    return (issues.length > 0) ? { issues, value: undefined } : { value: result }
}


// --------------------------------------------------------------------- //
// ----------------------------- MIDDLEWARE ---------------------------- //
// --------------------------------------------------------------------- //

class ValidationMiddleware implements Middleware {
    constructor() { }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        const ctx = invocation.context;
        if (!ctx.route) return invocation.proceed();
        const result = await validate(invocation.context as RouteContext);
        if (result.issues)
            throw new ValidationError(result.issues
                .map(x => ({ path: x.path.split("."), messages: x.messages })));
        (ctx as any).parameters = result.value
        return invocation.proceed()
    }
}

export { ValidationMiddleware }