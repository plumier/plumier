import reflect from "tinspector"
import * as tc from "typedconverter"

import { Class, hasKeyOf, isCustomClass } from "./common"
import {
    ActionContext,
    ActionResult,
    Invocation,
    Middleware,
    ValidationError,
    MetadataImpl,
    Metadata,
    CustomConverter,
} from "./types"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface CustomValidatorNode {
    value: any,
    path: string,
    parent?: { value: any, type: Class, decorators: any[] }
    validator: CustomValidatorFunction | string | symbol | CustomValidator
}

interface ValidationResult {
    result: any[],
    issues: tc.ResultMessages[]
}


export interface ValidatorDecorator {
    type: "ValidatorDecorator",
    validator: CustomValidatorFunction | string | symbol,
}

export interface ValidatorContext {
    name: string,
    ctx: ActionContext,
    parent?: { value: any, type: Class, decorators: any[] },
    metadata: Metadata
}

export interface AsyncValidatorResult {
    path: string,
    messages: string[]
}

export type CustomValidatorFunction = (value: any, info: ValidatorContext) => undefined | string | AsyncValidatorResult[] | Promise<AsyncValidatorResult[] | string | undefined>

export interface CustomValidator {
    validate(value: any, info: ValidatorContext): undefined | string | AsyncValidatorResult[] | Promise<AsyncValidatorResult[] | string | undefined>
}


// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

// Plumier supported custom async validation to possibly execute long running task inside custom validation. 
// Since typedconverter doesn't support async validation, thus it should executed separately (sync and async)
// Validation process is a traversal process through deep data type properties that make separate execution inefficient. 
// To solve the issue, a collection of custom validation decorator created during the sync process 
// using typed converter VisitorExtension then saved into collection of CustomValidatorNode.
// Furthermore async validation process doesn't need to do the traversal process because all the required data already provided

const getName = (path: string) => path.indexOf(".") > -1 ? path.substring(path.lastIndexOf(".") + 1) : path
const emptyObject = (obj: any) => Object.keys(obj).length === 0 && obj.constructor === Object

//custom visitor extension to gather the CustomValidatorNode
function customValidatorNodeVisitor(items: CustomValidatorNode[]) {
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

function getCurrentMetadata(node: CustomValidatorNode, ctx: ActionContext) {
    if (node.parent) {
        return reflect(node.parent.type).properties.find(x => x.name === getName(node.path))!
    }
    else {
        return ctx.route.action.parameters.find(x => x.name === getName(node.path))!
    }
}

async function validateNode(node: CustomValidatorNode, ctx: ActionContext): Promise<AsyncValidatorResult[]> {
    const name = getName(node.path)
    const currentMeta = { ...getCurrentMetadata(node, ctx), parent: node.parent?.type || ctx.route.controller.type }
    const info: ValidatorContext = { ctx, name, parent: node.parent, metadata: new MetadataImpl(ctx.parameters, ctx.route, currentMeta) as Metadata }
    if (node.value === undefined || node.value === null || emptyObject(node.value)) return []
    let validator: CustomValidator;
    if (typeof node.validator === "function")
        validator = { validate: node.validator }
    else if (hasKeyOf<CustomValidator>(node.validator, "validate"))
        validator = node.validator
    else
        validator = ctx.config.dependencyResolver.resolve(node.validator)
    const message = await validator.validate(node.value, info)
    if (!message) return []
    if (typeof message === "string")
        return [{ path: node.path, messages: [message] }]
    return message.map(y => <AsyncValidatorResult>({
        path: `${node.path}.${y.path}`,
        messages: y.messages
    }))
}

function validateSync(ctx: ActionContext, customVisitors: CustomConverter[]): ValidationResult {
    const result = []
    const issues: tc.ResultMessages[] = []
    const visitors = customVisitors.map(v => (next: tc.VisitorInvocation) => v(next, ctx))
    for (const [index, parMeta] of ctx.route.action.parameters.entries()) {
        const rawParameter = ctx.parameters[index]
        const parValue = tc.validate(rawParameter, {
            decorators: parMeta.decorators, path: parMeta.name, type: parMeta.type || Object,
            visitors, guessArrayElement: !!ctx.is("urlencoded") || !!ctx.is("multipart")
        })
        result.push(parValue.value)
        if (parValue.issues)
            issues.push(...parValue.issues)
    }
    return { result, issues }
}

async function validateAsync(ctx: ActionContext, nodes: CustomValidatorNode[]): Promise<ValidationResult> {
    if (nodes.length === 0) return { result: [], issues: [] }
    const results = await Promise.all(nodes.map(async x => validateNode(x, ctx)))
    return { result: [], issues: results.flatten() }
}


function mergeMessage(messages: tc.ResultMessages[]) {
    const hash: { [key: string]: tc.ResultMessages } = {}
    const result: tc.ResultMessages[] = []
    for (const invalid of messages) {
        if (!!hash[invalid.path]) {
            hash[invalid.path].messages.push(...invalid.messages)
        }
        else {
            hash[invalid.path] = invalid
            result.push(invalid)
        }
    }
    return result;
}

// --------------------------------------------------------------------- //
// -------------------------- IMPLEMENTATIONS -------------------------- //
// --------------------------------------------------------------------- //

async function validate(ctx: ActionContext) {
    if (ctx.route.action.parameters.length === 0) return []
    const nodes: CustomValidatorNode[] = []
    const visitors = [customValidatorNodeVisitor(nodes), ...ctx.config.typeConverterVisitors]
    const syncResult = validateSync(ctx, visitors)
    const asyncResult = await validateAsync(ctx, nodes)
    const issues = syncResult.issues.concat(asyncResult.issues)
    if (issues.length > 0) {
        throw new ValidationError(mergeMessage(issues).map(x => ({ path: x.path.split("."), messages: x.messages })));
    }
    return syncResult.result
}


class ValidatorMiddleware implements Middleware {
    async execute(invocation: Readonly<Invocation<ActionContext>>): Promise<ActionResult> {
        (invocation.ctx as any).parameters = await validate(invocation.ctx)
        return invocation.proceed()
    }
}

export { validate, ValidatorMiddleware }

