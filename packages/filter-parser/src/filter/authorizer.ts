import {
    ActionContext,
    ActionResult,
    createAuthContext,
    executeAuthorizer,
    Invocation,
    Middleware,
    throwAuthError,
} from "@plumier/core"
import reflect, { Class } from "@plumier/reflect"

import { getDecoratorType, ParserAst } from "../helper"
import { FilterParserDecorator } from "../decorator"
import { FilterNode, FilterNodeVisitor, filterNodeWalker, getFilterDecorators } from "./parser"


function createVisitor(columns: string[]): FilterNodeVisitor {
    return (node, prop, value) => {
        columns.push(prop.value)
        if (value.annotation === "Property")
            columns.push(value.value)
        return node
    }
}


async function checkAuthorize(type: Class, value: FilterNode, ctx: ActionContext) {
    const meta = reflect(type)
    const classDec = getFilterDecorators(meta.decorators)
    const auth = createAuthContext(ctx, "write")
    // get list of columns used by end user
    const columns: string[] = []
    const visitor = createVisitor(columns)
    filterNodeWalker(value, visitor)
    // take unauthorized column
    const unauthorized = []
    const accessedColumns = Array.from(new Set(columns))
    for (const col of accessedColumns) {
        const prop = meta.properties.find(x => x.name === col)!
        const dec = getFilterDecorators(prop.decorators)
        const decorators = dec.length > 0 ? dec : classDec
        // if no decorator provided (class/property) then just don't allow
        if (decorators.length === 0) {
            unauthorized.push(col)
            continue;
        }
        // if all decorators doesn't specify policy name then just allow (follow route authorization)
        if (decorators.every(x => x.policies.length === 0)) continue
        const authorized = await executeAuthorizer(decorators, auth)
        // if any of the policy allowed then authorize
        if (authorized) continue
        unauthorized.push(col)
    }
    if (unauthorized.length > 0)
        throwAuthError(auth, `Unauthorized to access filter properties ${unauthorized.join(", ")}`)
}

class FilterQueryAuthorizeMiddleware implements Middleware<ActionContext> {
    async execute(i: Readonly<Invocation<ActionContext>>): Promise<ActionResult> {
        const par = i.metadata!.action.parameters
            .find(x => x.decorators.some((d: FilterParserDecorator) => d.kind === "plumier-meta:filter-parser-decorator"))
        if (!par) return i.proceed()
        const raw = i.metadata!.actionParams.get(par.name)
        if (raw === undefined) return i.proceed()
        const value:FilterNode = raw[ParserAst]
        const dec: FilterParserDecorator = par.decorators.find((d: FilterParserDecorator) => d.kind === "plumier-meta:filter-parser-decorator")!
        const type = getDecoratorType(i.metadata!.controller.type, dec.type())
        await checkAuthorize(type, value, i.ctx)
        return i.proceed()
    }
}

export { FilterQueryAuthorizeMiddleware }