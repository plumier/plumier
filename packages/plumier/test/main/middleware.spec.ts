import { basename } from "path";
import Supertest from "supertest";

import { Plumier, WebApiFacility, middleware, Middleware, Invocation } from "../../src";

class InterceptBody implements Middleware {
    constructor(private newBody:any){}
    async execute(i:Invocation){
        const result = await i.proceed()
        result.body = this.newBody
        return result
    }
}

class ConcatBody implements Middleware {
    constructor(private body:any){}
    async execute(i:Invocation){
        const result = await i.proceed()
        result.body += this.body
        return result
    }
}

export class AnimalController {
    get(id: string) { }
}

@middleware.use(new InterceptBody("New Body"))
export class InterceptController {
    get() {
        return { body: "The Body" }
    }
}

@middleware.use(new ConcatBody("1"))
@middleware.use(new ConcatBody("2"))
@middleware.use(new ConcatBody("3"))
export class OrderController {
    get() {
        return "Body"
    }
}

@middleware.use(async (ctx, next) => {
    await next()
    ctx.body += "New Body"
})
export class KoaController {
    get() {
        return "Body"
    }
}

function fixture() {
    return new Plumier()
        .set(new WebApiFacility())
        .set({ rootPath: __dirname, controllerPath: basename(__filename) })
        .set({ mode: "production" })
}

describe("Middleware", () => {
    describe("Global Middleware", () => {
        const spy = jest.fn(() => { })
        it("Should able to intercept request and continue to next", async () => {
            const app = await fixture()
                .use({
                    execute: async x => {
                        spy()
                        return x.proceed()
                    }
                })
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200)
            expect(spy).toBeCalled()
        })

        it("Should able to modify response after controller execution", async () => {
            const app = await fixture()
                .use(new InterceptBody("The Body"))
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200, "The Body")
        })

        it("Should be able to use Koa middleware", async () => {
            const spy = jest.fn(() => { })
            const app = await fixture()
                .use(async (ctx, next) => {
                    spy()
                    await next()
                    ctx.body = "The Body"
                })
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200, "The Body")
            expect(spy).toBeCalled()
        })

        it("Should execute middleware in proper order", async () => {
            const spy = jest.fn(() => { })
            const app = await fixture()
                .use(async (ctx, next) => {
                    spy(1)
                    await next()
                    spy(2)
                })
                .use({
                    execute: async x => {
                        spy(3)
                        const result = x.proceed()
                        spy(4)
                        return result;
                    }
                })
                .use({
                    execute: async x => {
                        spy(5)
                        const result = x.proceed()
                        spy(6)
                        return result;
                    }
                })
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200)
            expect(spy.mock.calls).toEqual([[1], [3], [5], [6], [4], [2]])
        })
    })

    describe("Controller Middleware", () => {
        it("Should able to intercept request and continue to next", async () => {
            const app = await fixture().initialize()
            await Supertest(app.callback())
                .get("/intercept/get")
                .expect(200, "New Body")
        })

        it("Should execute middleware in proper order", async () => {
            const app = await fixture().initialize()
            await Supertest(app.callback())
                .get("/order/get")
                .expect(200, "Body321")
        })

        it("Should be able to use Koa middleware", async () => {
            const app = await fixture().initialize()
            await Supertest(app.callback())
                .get("/koa/get")
                .expect(200, "BodyNew Body")
        })
    })

    describe("Action Middleware", () => {
        it("Should able to intercept request and continue to next", async () => {

        })

        it("Should execute middleware in proper order", async () => {

        })

        it("Should be able to use Koa middleware", async () => {

        })
    })
})