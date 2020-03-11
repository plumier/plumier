import { authorize, CustomAuthorizerFunction, CustomValidatorFunction, middleware, route, val, ActionResult } from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import { sign } from "jsonwebtoken"
import supertest from "supertest"

import { fixture } from "../helper"



describe("Metaprogramming", () => {
    describe("Global Middleware", () => {
        it("Should able to access metadata from global middleware", async () => {
            const fn = jest.fn()

            class AnimalController {
                get(id: string) { return { id } }
            }
            const app = await fixture(AnimalController)
                .use(x => {
                    fn(x.metadata())
                    return x.proceed()
                })
                .initialize()
            await supertest(app.callback())
                .get("/animal/get?id=1234")
                .expect(200, { id: "1234" })
            expect(fn.mock.calls).toMatchSnapshot()
        })

        it("Should return undefined if access virtual route", async () => {
            const fn = jest.fn()
            class AnimalController {
                get(id: string) { return { id } }
            }
            const app = await fixture(AnimalController)
                .use(x => {
                    fn(x.metadata())
                    return x.proceed()
                })
                .use(async x => {
                    if(x.ctx.path === "/animal/got")
                        return new ActionResult({id: "1234"})
                    return x.proceed()
                })
                .initialize()
            await supertest(app.callback())
                .get("/animal/got")
                .expect(200, { id: "1234" })
            expect(fn.mock.calls).toMatchSnapshot()
        })
    })

    describe("Action Middleware", () => {
        it("Should able to access metadata from action controller", async () => {
            const fn = jest.fn()
            @middleware.use(x => {
                fn(x.metadata())
                return x.proceed()
            })
            class AnimalController {
                get(id: string) { return { id } }
            }
            const app = await fixture(AnimalController).initialize()
            await supertest(app.callback())
                .get("/animal/get?id=1234")
                .expect(200, { id: "1234" })
            expect(fn.mock.calls).toMatchSnapshot()
        })

        it("Should able to get parameter by name", async () => {
            const fn = jest.fn()
            @middleware.use(x => {
                fn(x.metadata().actionParams.get("id"))
                return x.proceed()
            })
            class AnimalController {
                get(id: string) { return { id } }
            }
            const app = await fixture(AnimalController).initialize()
            await supertest(app.callback())
                .get("/animal/get?id=1234")
                .expect(200, { id: "1234" })
            expect(fn.mock.calls).toMatchSnapshot()
        })

        it("Should return undefined if provided wrong parameter name", async () => {
            const fn = jest.fn()
            @middleware.use(x => {
                fn(x.metadata().actionParams.get("UserId"))
                return x.proceed()
            })
            class AnimalController {
                get(id: string) { return { id } }
            }
            const app = await fixture(AnimalController).initialize()
            await supertest(app.callback())
                .get("/animal/get?id=1234")
                .expect(200, { id: "1234" })
            expect(fn.mock.calls).toMatchSnapshot()
        })

        it("Should able to get parameter by number", async () => {
            const fn = jest.fn()
            @middleware.use(x => {
                fn(x.metadata().actionParams.get(0))
                return x.proceed()
            })
            class AnimalController {
                get(id: string) { return { id } }
            }
            const app = await fixture(AnimalController).initialize()
            await supertest(app.callback())
                .get("/animal/get?id=1234")
                .expect(200, { id: "1234" })
            expect(fn.mock.calls).toMatchSnapshot()
        })

        it("Should able to get check if has parameter", async () => {
            const fn = jest.fn()
            @middleware.use(x => {
                fn(x.metadata().actionParams.hasName("ID"))
                fn(x.metadata().actionParams.hasName("UserID"))
                return x.proceed()
            })
            class AnimalController {
                get(id: string) { return { id } }
            }
            const app = await fixture(AnimalController).initialize()
            await supertest(app.callback())
                .get("/animal/get?id=1234")
                .expect(200, { id: "1234" })
            expect(fn.mock.calls).toMatchSnapshot()
        })

        it("Should able to get all parameter names", async () => {
            const fn = jest.fn()
            @middleware.use(x => {
                fn(x.metadata().actionParams.names())
                return x.proceed()
            })
            class AnimalController {
                get(id: string, name: string) { return { id, name } }
            }
            const app = await fixture(AnimalController).initialize()
            await supertest(app.callback())
                .get("/animal/get?id=1234&name=mimi")
                .expect(200, { id: "1234", name: "mimi" })
            expect(fn.mock.calls).toMatchSnapshot()
        })

        it("Should able to get all parameter values", async () => {
            const fn = jest.fn()
            @middleware.use(x => {
                fn(x.metadata().actionParams.values())
                return x.proceed()
            })
            class AnimalController {
                get(id: string, name: string) { return { id, name } }
            }
            const app = await fixture(AnimalController).initialize()
            await supertest(app.callback())
                .get("/animal/get?id=1234&name=mimi")
                .expect(200, { id: "1234", name: "mimi" })
            expect(fn.mock.calls).toMatchSnapshot()
        })

        it("Should able spread invocation object", async () => {
            const fn = jest.fn()
            @middleware.use(({ ctx, metadata, proceed }) => {
                fn(metadata()?.controller.name)
                fn(ctx.url)
                return proceed()
            })
            class AnimalController {
                get(id: string) { return { id } }
            }
            const app = await fixture(AnimalController).initialize()
            await supertest(app.callback())
                .get("/animal/get?id=1234")
                .expect(200, { id: "1234" })
            expect(fn.mock.calls).toMatchSnapshot()
        })
    })

    describe("Custom Validator", () => {
        it("Should able to access metadata from custom validator", async () => {
            const fn = jest.fn()
            const greaterThan18: CustomValidatorFunction = (x, { metadata }) => {
                fn(metadata())
                return x < 18 ? "Not allowed" : undefined
            }
            class AnimalController {
                @route.get()
                get(@val.custom(greaterThan18) id: number) { return { id } }
            }
            const app = await fixture(AnimalController).initialize()
            await supertest(app.callback())
                .get("/animal/get?id=1234")
                .expect(200, { id: 1234 })
            expect(fn.mock.calls).toMatchSnapshot()
        })
    })


    describe("Custom Authorizer", () => {
        it("Should able to access metadata from custom authorizer", async () => {
            const secret = "secret"
            const token = sign({ id: 123, role: "User" }, secret)
            const fn = jest.fn()
            const customAuthorizer: CustomAuthorizerFunction = ({ metadata }) => {
                fn(metadata())
                return true
            }
            class AnimalController {
                @route.get()
                @authorize.custom(customAuthorizer)
                get(id: number) { return { id } }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret }))
                .initialize()
            await supertest(app.callback())
                .get("/animal/get?id=1234")
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, { id: 1234 })
            expect(fn.mock.calls).toMatchSnapshot()
        })
    })
})