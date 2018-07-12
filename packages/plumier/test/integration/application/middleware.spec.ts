import { basename } from "path";
import Supertest from "supertest";

import { Plumier, WebApiFacility, middleware, Middleware, Invocation } from "../../../src";
import { Class } from '../../../src/framework';
import { Context } from 'koa';

class InterceptBody implements Middleware {
    constructor(private newBody: any) { }
    async execute(i: Invocation) {
        const result = await i.proceed()
        result.body = this.newBody
        return result
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
        .set(new WebApiFacility())
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
            const spy = jest.fn(() => { })
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
            const spy = jest.fn(() => { })
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
            const spy = jest.fn(() => { })
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
    })
})