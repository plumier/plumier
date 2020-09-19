import { reflect } from "tinspector/src/reflect"

import { binder } from "./binder"
import { Class } from "./common"
import { RequestHookDecorator } from "./decorator/request-hook"
import { ActionContext, ActionResult, Invocation, Middleware } from "./types"

export class RequestHookMiddleware implements Middleware<ActionContext> {
    async execute(invocation: Readonly<Invocation<ActionContext>>): Promise<ActionResult> {
        const metadata = invocation.metadata!
        const bodies = []
        for (const par of metadata.action.parameters) {
            if (par.typeClassification === "Class" && par.type) {
                const meta = reflect(par.type as Class)
                const hooks = meta.methods.filter(x => x.decorators.some((x: RequestHookDecorator) => x.kind === "plumier-meta:request-hook"
                    && (x.method.length === 0 || x.method.some(m => m === invocation.ctx.method.toLocaleLowerCase()))))
                for (const hook of hooks) {
                    // bind request hook parameters
                    const pars = await binder(hook, invocation.ctx)
                    const value = metadata.actionParams.get(par.name);
                    // execute hook
                    await (par.type.prototype[hook.name] as Function).apply(value, pars)
                }
            }
        }
        return invocation.proceed()
    }
}