import {
    ActionContext,
    ActionResult,
    createAuthContext,
    executeAuthorizer,
    Invocation,
    Middleware,
    throwAuthError,
} from "@plumier/core"

import { SelectParserDecorator } from "../decorator"
import { ParserAst } from "../helper"
import { SelectColumnNode } from "./converter"


class SelectQueryAuthorizeMiddleware implements Middleware<ActionContext> {
    async execute(i: Readonly<Invocation<ActionContext>>): Promise<ActionResult> {
        const par = i.metadata!.action.parameters
            .find(x => x.decorators.some((d: SelectParserDecorator) => d.kind === "plumier-meta:select-parser-decorator"))
        if (!par) return i.proceed()
        const raw = i.metadata!.actionParams.get(par.name)
        const value: SelectColumnNode[] = raw[ParserAst]
        const unauthorized = []
        const auth = createAuthContext(i.ctx, "read")
        for (const val of value) {
            if (val.skipAuthCheck) continue
            if (val.authDecorators.length === 0) continue
            const authorized = await executeAuthorizer(val.authDecorators, auth)
            if (authorized) continue
            unauthorized.push(val.name)
        }
        if (unauthorized.length > 0)
            throwAuthError(auth, `Unauthorized to access filter properties ${unauthorized.join(", ")}`)
        return i.proceed()
    }
}

export { SelectQueryAuthorizeMiddleware }