import { Configuration, Invocation, RouteInfo } from "@plumier/core"
import { Context } from "koa"
import Ptr from "path-to-regexp"
import {Binder} from "@plumier/kernel"

/* ------------------------------------------------------------------------------- */
/* ------------------------------- ROUTER ---------------------------------------- */
/* ------------------------------------------------------------------------------- */

function toRegExp(route: RouteInfo, path: string): RouteMatcher {
    const keys: Ptr.Key[] = []
    const regexp = Ptr(route.url, keys)
    const match = regexp.exec(path)
    const query = !match ? {} : keys.reduce((a, b, i) => {
        a[b.name] = match![i + 1]
        return a;
    }, <any>{})
    return { match, query, method: route.method.toUpperCase(), route }
}

interface RouteMatcher {
    match: RegExpExecArray | null,
    query: any,
    method: string,
    route: RouteInfo
}

export function router(infos: RouteInfo[], config: Configuration, handler: (ctx: Context) => Invocation) {
    const matchers: { [key: string]: RouteMatcher | undefined } = {}
    const getMatcher = (path: string, method: string) => infos.map(x => toRegExp(x, path)).find(x => Boolean(x.match) && x.method == method)
    return async (ctx: Context, next: () => Promise<void>) => {
        const key = `${ctx.method}${ctx.path}`
        const match = matchers[key] || (matchers[key] = getMatcher(ctx.path, ctx.method))
        ctx.config = config;
        if (match) {
            Object.assign(ctx.request.query, match.query)
            const parameters = Binder.bindParameter(ctx, match.route.action, config.converters)
            ctx.route = match.route;
            ctx.parameters = parameters
        }
        const invocation = handler(ctx)
        const result = await invocation.proceed()
        await result.execute(ctx)
    }
}

