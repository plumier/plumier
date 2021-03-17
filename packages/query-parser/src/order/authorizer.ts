import { ActionContext, ActionResult, createAuthContext, Invocation, Middleware, throwAuthError } from "@plumier/core"

import { OrderParserDecorator } from "../decorator"
import { isAuthorized, ParserAst } from "../helper"
import { OrderColumnNode } from "./converter"


class OrderQueryAuthorizeMiddleware implements Middleware<ActionContext> {
    async execute(i: Readonly<Invocation<ActionContext>>): Promise<ActionResult> {
        const par = i.metadata!.action.parameters
            .find(x => x.decorators.some((d: OrderParserDecorator) => d.kind === "plumier-meta:order-parser-decorator"))
        if (!par) return i.proceed()
        const raw = i.metadata!.actionParams.get(par.name)
        if(raw === undefined) return i.proceed()
        const value: OrderColumnNode[] = raw[ParserAst]
        const unauthorized = []
        const auth = createAuthContext(i.ctx, "read")
        for (const val of value) {
            if (val.authDecorators.length === 0) continue
            const authorized = await isAuthorized(val.authDecorators, auth)
            if (authorized) continue
            unauthorized.push(val.name)
        }
        if (unauthorized.length > 0)
            throwAuthError(auth, `Unauthorized to order properties ${unauthorized.join(", ")}`)
        return i.proceed()
    }
}

export { OrderQueryAuthorizeMiddleware }