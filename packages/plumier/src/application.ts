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
            rootDir: "__UNSET__"
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
            let routes: RouteInfo[] = generateRoutes(this.config.rootDir, this.config.controller)
            for (const facility of this.config.facilities) {
                await facility.initialize(this, routes)
            }
            if (this.config.mode === "debug") printAnalysis(analyzeRoutes(routes, this.config))
            this.koa.use(router(routes, this.config))
            return this.koa
        }
        catch (e) {
            throw e
        }
    }
}
