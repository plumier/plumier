import reflect, { decorate } from "tinspector"
import * as tc from "typedconverter"

import { Class, hasKeyOf, isCustomClass } from "./common"
import {
    AsyncValidatorResult,
    CustomValidator,
    ActionContext,
    ValidationError,
    ValidatorDecorator,
    CustomValidatorFunction,
    ValidatorContext,
    Middleware,
    Invocation,
    ActionResult,
} from "./types"
import { checkAuthorize } from '@plumier/core'


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //


interface AsyncValidatorItem {
    value: any,
    path: string,
    parent?: { value: any, type: Class, decorators: any[] }
    validator: CustomValidatorFunction | string | symbol | CustomValidator
}

function createVisitor(items: AsyncValidatorItem[]) {
    return (i: tc.VisitorInvocation) => {
        const result = i.proceed();
        const decorators: ValidatorDecorator[] = i.decorators.filter((x: ValidatorDecorator) => x.type === "ValidatorDecorator")
        if (isCustomClass(i.type)) {
            const meta = reflect(i.type)
            const classDecorators = meta.decorators.filter((x: ValidatorDecorator) => x.type === "ValidatorDecorator")
            decorators.push(...classDecorators)
        }
        if (decorators.length > 0)
            items.push(...decorators.map(x => ({ value: i.value, path: i.path, parent: i.parent, validator: x.validator })))
        return result;
    }
}

tc.val.custom = (val: CustomValidatorFunction | string | symbol | CustomValidator) => {
    return decorate(<ValidatorDecorator>{ type: "ValidatorDecorator", validator: val }, ["Class", "Property", "Parameter"])
}

tc.val.result = (a: string, b: string | string[]) => {
    if (Array.isArray(b)) return [{ path: a, messages: b }]
    else return [{ path: a, messages: [b] }]
}

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //
const getName = (path: string) => path.indexOf(".") > -1 ? path.substring(path.lastIndexOf(".") + 1) : path

async function validateAsync(x: AsyncValidatorItem, ctx: ActionContext): Promise<AsyncValidatorResult[]> {
    const name = getName(x.path)
    const info: ValidatorContext = { ctx, name, parent: x.parent }
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

async function validate(ctx: ActionContext) {
    const decsAsync: AsyncValidatorItem[] = []
    const visitors = [createVisitor(decsAsync), ...(ctx.config.typeConverterVisitors || [])]
    const result: any[] = []
    const issues: tc.ResultMessages[] = []
    //sync validations
    for (const [index, parMeta] of ctx.route!.action.parameters.entries()) {
        const rawParameter = ctx.parameters[index]
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
    if (issues.length > 0)
        throw new ValidationError(issues.map(x => ({ path: x.path.split("."), messages: x.messages })));
    return result
}

class ValidatorMiddleware implements Middleware {
    async execute(invocation: Readonly<Invocation<ActionContext>>): Promise<ActionResult> {
        (invocation.ctx as any).parameters = await validate(invocation.ctx)
        return invocation.proceed()
    }
}

export { validate, ValidatorMiddleware }
