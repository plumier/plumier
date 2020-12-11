import { reflect } from "tinspector"

import { binder } from "./binder"
import { Class } from "./common"
import { RequestHookDecorator } from "./decorator/request-hook"
import { ActionContext, ActionResult, ControllerGeneric, Invocation, MetadataImpl, Middleware, OneToManyControllerGeneric } from "./types"

export const postSaveValue = Symbol.for("plumier:postSaveEntity")

async function executeHooks(ctx: ActionContext, kind: "preSave" | "postSave", type: Class, value: any) {
    const meta = reflect(type)
    const hooks = meta.methods.filter(x => x.decorators.some((x: RequestHookDecorator) => x.kind === "plumier-meta:request-hook"
        && x.type === kind
        && (x.method.length === 0 || x.method.some(m => m === ctx.method.toLowerCase()))))
    for (const hook of hooks) {
        // bind request hook parameters
        const pars = await binder(hook, ctx)
        // execute hook
        await (type.prototype[hook.name] as Function).apply(value, pars)
    }
}

export class RequestHookMiddleware implements Middleware<ActionContext> {
    async execute({ ctx, proceed }: Readonly<Invocation<ActionContext>>): Promise<ActionResult> {
        if (!["POST", "PUT", "PATCH"].some(x => x === ctx.method)) return proceed()
        const isGeneric = ctx.route.controller.type.prototype instanceof ControllerGeneric
        const isNestedGeneric = ctx.route.controller.type.prototype instanceof OneToManyControllerGeneric
        if (!isGeneric && !isNestedGeneric) return proceed()
        const metadata = new MetadataImpl(ctx.parameters, ctx.route, ctx.route.action)
        // find request body data type
        const par = metadata.action.parameters.find(par => par.typeClassification === "Class" && par.type)!
        // use the request body as the entity object
        const preValue = metadata.actionParams.get(par.name)
        await executeHooks(ctx, "preSave", par.type, preValue)
        const result = await proceed()
        const postValue = result.body[postSaveValue]
        await executeHooks(ctx, "postSave", par.type, postValue)
        return result
    }
}