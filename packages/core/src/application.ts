import Koa, { Context } from "koa"

import { HttpStatus } from "./http-status"
import { KoaMiddleware, Middleware } from './middleware';
import { Facility } from './facility';
import { Configuration, PlumierConfiguration } from './configuration';
import { RouteInfo } from './route-generator';
import reflect from 'tinspector';

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

declare module "koa" {
    interface Context {
        route?: Readonly<RouteInfo>,
        config: Readonly<Configuration>,
        parameters?: any[]
    }
}

export interface RouteContext extends Context {
    route: Readonly<RouteInfo>,
    parameters: any[]
}

export interface DependencyResolver {
    resolve(type: (new (...args: any[]) => any)): any
}


export class DefaultDependencyResolver implements DependencyResolver {
    resolve(type: new (...args: any[]) => any) {
        return new type()
    }
}

export interface Application {
    /**
     * Use Koa middleware
    ```
    use(KoaBodyParser())
    ```
     * Use inline Koa middleware 
    ```
    use(async (ctx, next) => { })
    ```
     */
    use(middleware: KoaMiddleware): Application

    /**
     * Use plumier middleware by class instance inherited from Middleware
    ```
    use(new MyMiddleware())
    ```
     * Use plumier middleware by inline object
    ```
    use({ execute: x => x.proceed()})
    use({ execute: async x => {
        return new ActionResult({ json: "body" }, 200)
    })
    ```
     */

    use(middleware: Middleware): Application

    /**
     * Set facility (advanced configuration)
    ```
    set(new WebApiFacility())
    ```
     */
    set(facility: Facility): Application

    /**
     * Set part of configuration
    ```
    set({ controllerPath: "./my-controller" })
    ```
     * Can be specified more than one configuration
    ```
    set({ mode: "production", rootPath: __dirname })
    ```
     */
    set(config: Partial<Configuration>): Application

    /**
     * Initialize Plumier app and return Koa application
    ```
    app.initialize().then(koa => koa.listen(8000))
    ```
     * For testing purposes
    ```
    const koa = await app.initialize()
    supertest(koa.callback())
    ```
     */
    initialize(): Promise<Koa>
}

export interface PlumierApplication extends Application {
    readonly koa: Koa,
    readonly config: Readonly<PlumierConfiguration>
}

// --------------------------------------------------------------------- //
// ------------------------------- ERROR ------------------------------- //
// --------------------------------------------------------------------- //

export class HttpStatusError extends Error {
    constructor(public status: HttpStatus, message?: string) {
        super(message)
        Object.setPrototypeOf(this, HttpStatusError.prototype);
    }
}


// --------------------------------------------------------------------- //
// ----------------------------- DECORATORS ---------------------------- //
// --------------------------------------------------------------------- // 

export function domain() { return reflect.parameterProperties() }
