import Cors from "@koa/cors"
import {
    Class,
    DefaultFacility,
    HttpStatusError,
    PlumierApplication,
    ValidationMiddleware,
    ValidatorStore
} from "@plumier/core"
import BodyParser from "koa-body"
import { VisitorExtension } from 'typedconverter';


/**
 * Preset configuration for building rest. This facility contains:
 * 
 * parameter binder
 * 
 * body parser: koa-body
 * 
 * cors: @koa/cors
 */
export class WebApiFacility extends DefaultFacility {
    constructor(private opt?: {
        controller?: string | Class | Class[],
        bodyParser?: BodyParser.IKoaBodyOptions, 
        cors?: Cors.Options,
        validators?: ValidatorStore
    }) { super() }

    setup(app: Readonly<PlumierApplication>) {
        app.koa.use(async (ctx, next) => {
            try {
                await next()
            }
            catch (e) {
                if (e instanceof HttpStatusError)
                    ctx.throw(e.status, e)
                else
                    ctx.throw(500, e)
            }
        })
        app.koa.use(BodyParser(this.opt && this.opt.bodyParser))
        app.koa.use(Cors(this.opt && this.opt.cors))
        if (this.opt && this.opt.controller)
            app.set({ controller: this.opt.controller })
        if (this.opt && this.opt.validators)
            app.set({ validators: this.opt.validators })
        app.use(new ValidationMiddleware(app.config))
    }
}

/**
 * Preset configuration for building restful style api. This facility contains:
 * 
 * parameter binder
 * 
 * body parser: koa-body
 * 
 * cors: @koa/cors
 * 
 * default response status: { get: 200, post: 201, put: 204, delete: 204 }
 */
export class RestfulApiFacility extends WebApiFacility {
    setup(app: Readonly<PlumierApplication>) {
        super.setup(app)
        app.set({ responseStatus: { post: 201, put: 204, delete: 204 } })
    }
}

