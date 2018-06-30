import Koa from "koa"
import Supertest, { CallbackHandler, Response } from "supertest"
import { ActionResult, HttpStatusError, Middleware } from '../../src';

describe("ActionResult", () => {
    it("Should execute context properly with default 200", async () => {
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

describe("HttpStatusError", () => {
    it("Should instantiate properly", () => {
        const error = new HttpStatusError("MESSAGE", 200)
        expect(error.message).toBe("MESSAGE")
        expect(error.status).toBe(200)
    })

    it("Should be instance of Error", () => {
        const error = new HttpStatusError("MESSAGE", 200)
        expect(error).toBeInstanceOf(Error)
    })
})

describe("Middleware", () => {
    describe("Middleware.toKoa", () => {
        it("Should able end request by returning ActionResult", async () => {
            const app = new Koa()
            const mdw = Middleware.toKoa({ execute: async x => new ActionResult({ body: "The Body" }) })
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
            const mdw = Middleware.toKoa({ execute: x => x.proceed() })
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

        it("Should able to change body after proceed()", async  () => {
            const app = new Koa()
            const mdw = Middleware.toKoa({
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

})