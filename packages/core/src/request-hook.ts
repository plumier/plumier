import { reflect } from "tinspector"

import { binder } from "./binder"
import { Class } from "./common"
import { RequestHookDecorator } from "./decorator/request-hook"
import { ActionContext, ActionResult, Invocation, Middleware } from "./types"

async function executeHooks(invocation: Invocation<ActionContext>, type: "preSave"|"postSave") {
    const metadata = invocation.metadata!
    const ctx = invocation.ctx;
    for (const par of metadata.action.parameters) {
        if (par.typeClassification === "Class" && par.type) {
            const meta = reflect(par.type as Class)
            const hooks = meta.methods.filter(x => x.decorators.some((x: RequestHookDecorator) => x.kind === "plumier-meta:request-hook"
                && x.type === type
                && (x.method.length === 0 || x.method.some(m => m === ctx.method.toLocaleLowerCase()))))
            for (const hook of hooks) {
                // bind request hook parameters
                const pars = await binder(hook, ctx)
                const value = metadata.actionParams.get(par.name);
                // execute hook
                await (par.type.prototype[hook.name] as Function).apply(value, pars)
            }
        }
    }
}

export class RequestHookMiddleware implements Middleware<ActionContext> {
    async execute(invocation: Readonly<Invocation<ActionContext>>): Promise<ActionResult> {
        await executeHooks(invocation, "preSave")
        const result = await invocation.proceed()
        await executeHooks(invocation, "postSave")
        return result
    }
}