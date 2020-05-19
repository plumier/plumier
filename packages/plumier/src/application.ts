import {
    analyzeRoutes,
    Application,
    Configuration,
    DefaultDependencyResolver,
    Facility,
    generateRoutes,
    hasKeyOf,
    Middleware,
    MiddlewareFunction,
    PlumierApplication,
    PlumierConfiguration,
    printAnalysis,
    RouteInfo,
    router,
    RouteMetadata,
    mergeRoutes
} from "@plumier/core"
import Koa from "koa"
import { dirname } from "path"

export class Plumier implements PlumierApplication {
    readonly config: Readonly<PlumierConfiguration>;
    readonly koa: Koa

    constructor() {
        this.koa = new Koa()
        this.config = {
            mode: "debug",
            controller: "./controller",
            dependencyResolver: new DefaultDependencyResolver(),
            middlewares: [],
            facilities: [],
            roleField: "role",
            enableAuthorization: false,
            rootDir: "__UNSET__",
            trustProxyHeader: false
        }
    }

    use(option: string | symbol | MiddlewareFunction | Middleware): Application {
        this.config.middlewares.push(option)
        return this
    }

    set(facility: Facility): Application
    set(config: Partial<Configuration>): Application
    set(config: Partial<Configuration> | Facility): Application {
        if (hasKeyOf<Facility>(config, "setup")) {
            config.setup(this)
            this.config.facilities.push(config)
        }
        else
            Object.assign(this.config, config)
        return this;
    }

    async initialize(): Promise<Koa> {
        try {
            if (process.env["NODE_ENV"] === "production")
                Object.assign(this.config, { mode: "production" })
            //get file location of script who initialized the application to calculate the controller path
            //module.parent.parent.filename -> because Plumier app also exported in plumier/src/index.ts
            if (this.config.rootDir === "__UNSET__")
                (this.config as Configuration).rootDir = dirname(module.parent!.parent!.filename)
            //generate routes 
            const rawRoutes: RouteMetadata[] = []
            for (const facility of this.config.facilities) {
                const genRoutes = await facility.generateRoutes(this)
                rawRoutes.push(...genRoutes)
            }
            const routes = mergeRoutes(rawRoutes)
            //run initialize
            for (const facility of this.config.facilities) {
                await facility.initialize(this, routes)
            }
            if (this.config.mode === "debug") {
                printAnalysis(analyzeRoutes(routes, this.config))
            }
            const actionRoutes = routes.filter((x):x is RouteInfo => x.kind === "ActionRoute")
            this.koa.use(router(actionRoutes, this.config))
            this.koa.proxy = this.config.trustProxyHeader
            return this.koa
        }
        catch (e) {
            throw e
        }
    }

    async listen(port?: number | string) {
        const app = await this.initialize()
        let envPort: number | undefined;
        if (typeof port === "string") {
            const result = parseInt(port)
            if (isNaN(result)) throw Error(`Unable to parse port number ${port}. Please provide a valid integer number`)
            envPort = result
        }
        else
            envPort = port
        if (this.config.mode === "debug")
            console.log(`Server ready http://localhost:${envPort}/`)
        return app.listen(envPort)
    }
}
