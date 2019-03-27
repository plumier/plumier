import { Context } from 'koa';
import { ActionResult } from './action-result';
import { RouteInfo } from './route-generator';
import { decorate } from 'tinspector';
import { Configuration } from './configuration';


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

export type KoaMiddleware = (ctx: Context, next: () => Promise<void>) => Promise<any>
export interface MiddlewareDecorator { name: "Middleware", value: Middleware[] }

export interface Invocation {
    context: Readonly<Context>
    proceed(): Promise<ActionResult>
}

export interface Middleware {
    execute(invocation: Readonly<Invocation>): Promise<ActionResult>
}

declare module "koa" {
    interface Context {
        route?: Readonly<RouteInfo>,
        config: Readonly<Configuration>,
        parameters?: any[]
    }
}

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

export namespace MiddlewareUtil {
    export function fromKoa(middleware: KoaMiddleware): Middleware {
        return {
            execute: async x => {
                await middleware(x.context, async () => {
                    const nextResult = await x.proceed()
                    await nextResult.execute(x.context)
                })
                return ActionResult.fromContext(x.context)
            }
        }
    }
}


// --------------------------------------------------------------------- //
// ----------------------------- DECORATOR ----------------------------- //
// --------------------------------------------------------------------- //

export namespace middleware {
    export function use(...middleware: (Middleware | KoaMiddleware)[]) {
        const mdw = middleware.map(x => typeof x == "function" ? MiddlewareUtil.fromKoa(x) : x).reverse()
        const value: MiddlewareDecorator = { name: "Middleware", value: mdw }
        return decorate(value, ["Class", "Method"])
    }

    export function extractDecorators(route: RouteInfo): Middleware[] {
        const classDecorator: MiddlewareDecorator[] = route.controller.decorators.filter(x => x.name == "Middleware")
        const methodDecorator: MiddlewareDecorator[] = route.action.decorators.filter(x => x.name == "Middleware")
        const extract = (d: MiddlewareDecorator[]) => d.map(x => x.value).flatten()
        return extract(classDecorator)
            .concat(extract(methodDecorator))
            .reverse()
    }
}