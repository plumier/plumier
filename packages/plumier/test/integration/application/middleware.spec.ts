import { invoke } from '@plumier/core'
import { Context } from "koa"
import Plumier, { bind, Class, Invocation, Middleware, middleware, RestfulApiFacility, route } from "plumier"
import Supertest from "supertest"


class InterceptBody implements Middleware {
    constructor(private newBody: any) { }
    async execute(i: Invocation) {
        const result = await i.proceed()
        result.body = this.newBody
        return result
    }
}

class AssertParameterMiddleware implements Middleware {
    constructor(private expected: any[]) { }
    async execute(i: Invocation) {
        expect(i.context.parameters).toMatchObject(this.expected)
        return i.proceed()
    }
}

function KoaInterceptBody(body: any) {
    return async (ctx: Context, next: () => Promise<any>) => {
        await next()
        ctx.body = body
    }
}

function fixture(controller: Class) {
    return new Plumier()
        .set(new RestfulApiFacility())
        .set({ mode: "production" })
        .set({ controller: [controller] })
}

describe("Middleware", () => {
    describe("Global Middleware", () => {

        it("Should able to modify response after controller execution", async () => {
            class AnimalController {
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .use(new InterceptBody("The Body"))
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200, "The Body")
        })

        it("Should be able to access route and configuration from global middleware", async () => {
            class AnimalController {
                get() {
                    return "Body"
                }
            }
            const fn = jest.fn((a, b) => { })
            const app = await fixture(AnimalController)
                .use({
                    execute: async x => {
                        fn(x.context.route!.url, x.context.config.mode)
                        return x.proceed()
                    }
                })
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200)
            expect(fn).toBeCalledWith("/animal/get", "production")
        })

        it("Should be able to use Koa middleware", async () => {
            class AnimalController {
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .use(KoaInterceptBody("The Body"))
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200, "The Body")
        })

        it("Should execute middleware in proper order", async () => {
            class AnimalController {
                get() {
                    return "Body"
                }
            }
            const spy = jest.fn((a) => { })
            const app = await fixture(AnimalController)
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

        it("Should able to access action parameter from middleware", async () => {
            class AnimalController {
                @route.get()
                get(a: number, b: string, c: boolean) {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .use(new AssertParameterMiddleware([1, "1", true]))
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get?a=1&b=1&c=1")
                .expect(200)
        })

    })

    describe("Controller Middleware", () => {
        it("Should able to intercept request and continue to next", async () => {
            @middleware.use(new InterceptBody("New Body"))
            class AnimalController {
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200, "New Body")
        })

        it("Should be able to use Koa middleware", async () => {
            @middleware.use(KoaInterceptBody("New Body"))
            class AnimalController {
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200, "New Body")
        })

        it("Should execute middleware in proper order", async () => {
            const spy = jest.fn((a) => { })
            @middleware.use(async (ctx, next) => {
                spy(1)
                await next()
                spy(2)
            })
            @middleware.use({
                execute: async x => {
                    spy(3)
                    const result = x.proceed()
                    spy(4)
                    return result;
                }
            })
            @middleware.use({
                execute: async x => {
                    spy(5)
                    const result = x.proceed()
                    spy(6)
                    return result;
                }
            })
            class AnimalController {
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200)
            expect(spy.mock.calls).toEqual([[1], [3], [5], [6], [4], [2]])
        })

        it("Should able to access action parameter from middleware", async () => {

            @middleware.use(new AssertParameterMiddleware([1, "1", true]))
            class AnimalController {
                @route.get()
                get(a: number, b: string, c: boolean) {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get?a=1&b=1&c=1")
                .expect(200)
        })
    })

    describe("Action Middleware", () => {
        it("Should able to intercept request and continue to next", async () => {
            class AnimalController {
                @middleware.use(new InterceptBody("New Body"))
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200, "New Body")
        })

        it("Should be able to use Koa middleware", async () => {
            class AnimalController {
                @middleware.use(KoaInterceptBody("New Body"))
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200, "New Body")
        })

        it("Should execute middleware in proper order", async () => {
            const spy = jest.fn((a) => { })
            class AnimalController {
                @middleware.use(async (ctx, next) => {
                    spy(1)
                    await next()
                    spy(2)
                })
                @middleware.use({
                    execute: async x => {
                        spy(3)
                        const result = x.proceed()
                        spy(4)
                        return result;
                    }
                })
                @middleware.use({
                    execute: async x => {
                        spy(5)
                        const result = x.proceed()
                        spy(6)
                        return result;
                    }
                })
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200)
            expect(spy.mock.calls).toEqual([[1], [3], [5], [6], [4], [2]])
        })

        it("Should able to access action parameter from middleware", async () => {

            class AnimalController {
                @middleware.use(new AssertParameterMiddleware([1, "1", true]))
                @route.get()
                get(a: number, b: string, c: boolean) {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get?a=1&b=1&c=1")
                .expect(200)
        })
    })

    describe("Controller Invoker", () => {
        it("Should be able to invoke another controller from inside controller", async () => {
            class AnimalController {
                get() {
                    return { method: "get" }
                }

                list(@bind.ctx() ctx:Context){
                    return invoke(ctx, ctx.routes.find(x => x.action.name === "get")!)
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/list")
                .expect(200, { method: "get" })
        })

        it("Should be able to invoke another controller from inside controller with the same signature", async () => {
            class AnimalController {
                @route.get("get/:id")
                get(id:string, offset:number) {
                    return { id, offset }
                }

                @route.get("list/:id")
                list(id:string, offset:number, @bind.ctx() ctx:Context){
                    return invoke(ctx, ctx.routes.find(x => x.action.name === "get")!)
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/list/200?offset=30")
                .expect(200, { id: "200", offset: 30 })
        })

        it("Should be able to invoke another controller from inside controller with POST method", async () => {
            class AnimalController {
                @route.post()
                get(id:string, offset:number) {
                    return { id, offset }
                }

                @route.post()
                list(id:string, offset:number, @bind.ctx() ctx:Context){
                    return invoke(ctx, ctx.routes.find(x => x.action.name === "get")!)
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .post("/animal/list")
                .send({id: "200", offset: 30})
                .expect(201, { id: "200", offset: 30 })
        })

        it("Should able to invoke controller from inside middleware", async () => {
            class AnimalController {
                get() {
                    return { method: "get" }
                }
            }
            const app = await fixture(AnimalController)
                .use({
                    execute: async i => {
                        if (i.context.state.caller === "system" && i.context.request.path === "/hello")
                            return invoke(i.context, i.context.routes[0])
                        else
                            return i.proceed()
                    }
                })
                .initialize()
            await Supertest(app.callback())
                .get("/hello")
                .expect(200, { method: "get" })
        })

        it("Should able to invoke controller from inside middleware with predefined parameters", async () => {
            class AnimalController {
                get(id:string) {
                    return { id }
                }
            }
            const app = await fixture(AnimalController)
                .use({
                    execute: async i => {
                        if (i.context.state.caller === "system" && i.context.request.path === "/hello"){
                            (i.context.parameters as any) = [i.context.query.id]
                            return invoke(i.context, i.context.routes[0])
                        }
                        else
                            return i.proceed()
                    }
                })
                .initialize()
            await Supertest(app.callback())
                .get("/hello?id=300")
                .expect(200, { id: "300" })
        })
    })
})