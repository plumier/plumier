import { MiddlewareUtil } from "@plumjs/core";
import Koa from "koa";
import Supertest from "supertest";

import Plumier, { ActionResult, ConversionError, HttpStatusError, Middleware, WebApiFacility } from "../../../src";
import { pipe } from "../../../src/application";

describe("ActionResult", () => {
    it("Should execute context properly", async () => {
        const app = new Koa()
        app.use((ctx, next) => {
            const result = new ActionResult({ body: "The Body" })
            result.execute(ctx)
        })
        await Supertest(app.callback())
            .get("/")
            .expect(200)
            .expect({ body: "The Body" })
    })

    it("Should not set body if not provided", async () => {
        const app = new Koa()
        app.use((ctx, next) => {
            const result = new ActionResult(undefined, 200)
            result.execute(ctx)
        })
        const result = await Supertest(app.callback())
            .get("/")
            .expect(200)
        expect(result.body).toEqual({})
    })

    it("Should execute context with status", async () => {
        const app = new Koa()
        app.use((ctx, next) => {
            const result = new ActionResult({ body: "The Body" }, 201)
            result.execute(ctx)
        })
        await Supertest(app.callback())
            .get("/")
            .expect(201)
            .expect({ body: "The Body" })
    })

    it("Should execute context with header information", async () => {
        const app = new Koa()
        app.use((ctx, next) => {
            const result = new ActionResult({ body: "The Body" })
                .header("accept", "gzip")
            result.execute(ctx)
        })
        const result = await Supertest(app.callback())
            .get("/")
        expect(result.body).toEqual({ body: "The Body" })
        expect(result.header).toMatchObject({ accept: "gzip" })
    })
})

describe("WebApiFacility", () => {
    class AnimalController { get() { } }
    it("Should able to configure body parser", async () => {
        const app = new Plumier()
        app.set({ controller: [AnimalController], mode: "production" })
        app.set(new WebApiFacility({ bodyParser: { strict: false } }))
        await app.initialize()
        expect(app).not.toBeNull()
    })

    it("Should able to configure cors", async () => {
        const app = new Plumier()
        app.set({ controller: [AnimalController], mode: "production" })
        app.set(new WebApiFacility({ cors: { maxAge: 50 } }))
        await app.initialize()
        expect(app).not.toBeNull()
    })
})

describe("HttpStatusError", () => {
    it("Should instantiate properly", () => {
        const error = new HttpStatusError(200, "MESSAGE")
        expect(error.message).toBe("MESSAGE")
        expect(error.status).toBe(200)
    })

    it("Should be instance of Error", () => {
        const error = new HttpStatusError(200, "MESSAGE")
        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(HttpStatusError)
    })
})

describe("ConversionError", () => {
    it("Should instantiate properly", () => {
        const error = new ConversionError({ path: ["a", "b"], type: "Number", value: 200 }, "MESSAGE")
        expect(error.message).toBe("MESSAGE")
        expect(error.status).toBe(400)
        expect(error.info).toEqual({ path: ["a", "b"], type: "Number", value: 200 })
    })

    it("Should be instance of Error", () => {
        const error = new ConversionError(<any>{})
        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(HttpStatusError)
        expect(error).toBeInstanceOf(ConversionError)
    })
})

describe("Middleware", () => {
    /*
    describe("Middleware.toKoa", () => {
        it("Should able end request by returning ActionResult", async () => {
            const app = new Koa()
            const mdw = MiddlewareUtil.toKoa({ execute: async x => new ActionResult({ body: "The Body" }) })
            app.use(mdw)
                .use((ctx, next) => {
                    ctx.body = { body: "Body From Other Middleware" }
                })
            await Supertest(app.callback())
                .get("/")
                .expect(200)
                .expect({ body: "The Body" })
        })

        it("Should able to chain request to next middleware", async () => {
            const app = new Koa()
            const mdw = MiddlewareUtil.toKoa({ execute: x => x.proceed() })
            app.use(mdw)
                .use((ctx, next) => {
                    ctx.status = 201
                    ctx.body = { body: "Body From Other Middleware" }
                })
            await Supertest(app.callback())
                .get("/")
                .expect(201)
                .expect({ body: "Body From Other Middleware" })
        })

        it("Should able to change body after proceed()", async () => {
            const app = new Koa()
            const mdw = MiddlewareUtil.toKoa({
                execute: async x => {
                    const result = await x.proceed()
                    result.body = { body: "The Body" }
                    return result
                }
            })
            app.use(mdw)
                .use((ctx, next) => {
                    ctx.status = 201
                    ctx.body = { body: "Body From Other Middleware" }
                })
            await Supertest(app.callback())
                .get("/")
                .expect(201)
                .expect({ body: "The Body" })
        })

    })
*/
    describe("Middleware.fromKoa", () => {

        function fixture(mdw: Middleware) {
            const ctx = <any>{}
            return pipe([mdw], ctx, {
                context: ctx, proceed: async () => {
                    const result = new ActionResult({ body: "The Main Body" })
                    result.execute(ctx)
                    return result
                }
            })
        }

        it("Should able end request by not calling next", async () => {
            const mdw = MiddlewareUtil.fromKoa(async (ctx, next) => {
                ctx.body = { body: "The Body" }
            })
            const result = await fixture(mdw).proceed()
            expect(result.body).toEqual({ body: "The Body" })
        })

        it("Should able to chain request to next middleware", async () => {
            const mdw = MiddlewareUtil.fromKoa(async (ctx, next) => {
                await next()
            })
            const result = await fixture(mdw).proceed()
            expect(result.body).toEqual({ body: "The Main Body" })
        })

        it("Should able to change body after next", async () => {
            const mdw = MiddlewareUtil.fromKoa(async (ctx, next) => {
                await next()
                ctx.body = { body: "The Body" }
            })
            const result = await fixture(mdw).proceed()
            expect(result.body).toEqual({ body: "The Body" })
        })
    })
})