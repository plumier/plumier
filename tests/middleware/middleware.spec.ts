import { invoke, MiddlewareUtil, ActionResult, DefaultDependencyResolver, CustomAuthorizer, CustomAuthorizerFunction } from '@plumier/core'
import { Context } from "koa"
import Plumier, { bind, Class, Invocation, Middleware, middleware, RestfulApiFacility, route } from "plumier"
import Supertest from "supertest"


const resolver = new DefaultDependencyResolver()

@resolver.register("lorem")
class MiddlewareWithStringRegistry implements Middleware {
    async execute(i: Invocation) {
        const result = await i.proceed()
        result.body = "The Body"
        return result
    }
}

const registryId = Symbol("lorem")

@resolver.register(registryId)
class MiddlewareWithSymbolRegistry implements Middleware {
    async execute(i: Invocation) {
        const result = await i.proceed()
        result.body = "The Body"
        return result
    }
}


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
        expect(i.ctx.parameters).toMatchObject(this.expected)
        return i.proceed()
    }
}

function KoaInterceptBody(body: any) {
    return MiddlewareUtil.fromKoa(async (ctx: Context, next: () => Promise<any>) => {
        await next()
        ctx.body = body
    })
}

function fixture(controller: Class) {
    return new Plumier()
        .set(new RestfulApiFacility())
        .set({ mode: "production" })
        .set({ controller: [controller] })
}

async function returnError(i: Invocation) {
    try {
        return i.proceed()
    }
    catch (e) {
        return new ActionResult(e.message, 500)
    }
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
                        fn(x.ctx.route!.url, x.ctx.config.mode)
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

        it("Should be able to use string middleware", async () => {
            class AnimalController {
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .set({ dependencyResolver: resolver })
                .use("lorem")
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200, "The Body")
        })

        it("Should be able to use symbol middleware", async () => {
            class AnimalController {
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .set({ dependencyResolver: resolver })
                .use(registryId)
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200, "The Body")
        })

        it("Should throw error if wrong id provided", async () => {
            const fn = jest.fn()
            @middleware.use(x => {
                return x.proceed()
            })
            class AnimalController {
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .set({ dependencyResolver: resolver })
                .use(returnError)
                .use("ipsum")
                .initialize()
            app.on("error", e => fn(e))
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(500)
            expect(fn.mock.calls).toMatchSnapshot()
        })

        it("Should execute middleware in proper order", async () => {
            class AnimalController {
                get() {
                    return "Body"
                }
            }
            const spy = jest.fn((a) => { })
            const app = await fixture(AnimalController)
                .use(MiddlewareUtil.fromKoa(async (ctx, next) => {
                    spy(1)
                    await next()
                    spy(2)
                }))
                .use(async x => {
                    spy(3)
                    const result = x.proceed()
                    spy(4)
                    return result;
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

        it("Should able to use string middleware", async () => {
            @middleware.use("lorem")
            class AnimalController {
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .set({ dependencyResolver: resolver })
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200, "The Body")
        })

        it("Should able to use symbol middleware", async () => {
            @middleware.use(registryId)
            class AnimalController {
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .set({ dependencyResolver: resolver })
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200, "The Body")
        })


        it("Should throw error if wrong id provided", async () => {
            const spy = jest.fn()
            @middleware.use("ipsum")
            class AnimalController {
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .set({ dependencyResolver: resolver })
                .use(returnError)
                .initialize()
            app.on("error", e => {
                spy(e)
            })
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(500)
            expect(spy.mock.calls).toMatchSnapshot()
        })

        it("Should execute middleware in proper order", async () => {
            const spy = jest.fn((a) => { })
            @middleware.use(MiddlewareUtil.fromKoa(async (ctx, next) => {
                spy(1)
                await next()
                spy(2)
            }))
            @middleware.use(async x => {
                spy(3)
                const result = x.proceed()
                spy(4)
                return result;
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

        it("Should be able to use string middleware", async () => {
            class AnimalController {
                @middleware.use("lorem")
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .set({ dependencyResolver: resolver })
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200, "The Body")
        })

        it("Should be able to use symbol middleware", async () => {
            class AnimalController {
                @middleware.use(registryId)
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .set({ dependencyResolver: resolver })
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200, "The Body")
        })

        it("Should throw error if wrong id provided", async () => {
            const spy = jest.fn()
            class AnimalController {
                @middleware.use("ipsum")
                get() {
                    return "Body"
                }
            }
            const app = await fixture(AnimalController)
                .set({ dependencyResolver: resolver })
                .use(returnError)
                .initialize()
            app.on("error", e => {
                spy(e)
            })
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(500)
            expect(spy.mock.calls).toMatchSnapshot()
        })

        it("Should execute middleware in proper order", async () => {
            const spy = jest.fn((a) => { })
            class AnimalController {
                @middleware.use(MiddlewareUtil.fromKoa(async (ctx, next) => {
                    spy(1)
                    await next()
                    spy(2)
                }))
                @middleware.use(async x => {
                    spy(3)
                    const result = x.proceed()
                    spy(4)
                    return result;
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
    })

    describe("Controller Invoker", () => {
        it("Should be able to invoke another controller from inside controller", async () => {
            class AnimalController {
                get() {
                    return { method: "get" }
                }

                list(@bind.ctx() ctx: Context) {
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
                get(id: string, offset: number) {
                    return { id, offset }
                }

                @route.get("list/:id")
                list(id: string, offset: number, @bind.ctx() ctx: Context) {
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
                get(id: string, offset: number) {
                    return { id, offset }
                }

                @route.post()
                list(id: string, offset: number, @bind.ctx() ctx: Context) {
                    return invoke(ctx, ctx.routes.find(x => x.action.name === "get")!)
                }
            }
            const app = await fixture(AnimalController)
                .initialize()
            await Supertest(app.callback())
                .post("/animal/list")
                .send({ id: "200", offset: 30 })
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
                        if (i.ctx.state.caller === "system" && i.ctx.request.path === "/hello")
                            return invoke(i.ctx, i.ctx.routes[0])
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
                get(id: string) {
                    return { id }
                }
            }
            const app = await fixture(AnimalController)
                .use({
                    execute: async i => {
                        if (i.ctx.state.caller === "system" && i.ctx.request.path === "/hello") {
                            (i.ctx.parameters as any) = [i.ctx.query.id]
                            return invoke(i.ctx, i.ctx.routes[0])
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
