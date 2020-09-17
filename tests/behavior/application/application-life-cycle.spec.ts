import {
    authorize,
    AuthorizerFunction,
    bind,
    CustomValidatorFunction,
    middleware,
    MiddlewareFunction,
    route,
    val,
} from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import { sign } from "jsonwebtoken"
import { Context } from "koa"
import Plumier, { WebApiFacility } from "plumier"
import supertest = require("supertest")

describe("Application life cycle", () => {
    it("Should provide correct application life cycle", async () => {
        const spy = jest.fn()
        const SECRET = "abcd"
        const USER_TOKEN = sign({ email: "ketut@gmail.com", role: "user" }, SECRET)

        const createMdw = (name: string): MiddlewareFunction => async x => {
            spy("before middleware: " + name)
            const result = await x.proceed()
            spy("after middleware: " + name)
            return result;
        }

        const customAuthorizer: AuthorizerFunction = i => {
            spy("authorizer")
            return true
        }

        const customBinder = (x: Context) => {
            spy("parameter binder")
            return x.query.data
        }

        const customValidator: CustomValidatorFunction = x => {
            spy("validator")
            return undefined
        }

        @middleware.use(createMdw("controller 1"))
        @middleware.use(createMdw("controller 2"))
        class AnimalController {
            @middleware.use(createMdw("action 1"))
            @middleware.use(createMdw("action 2"))
            @authorize.custom(customAuthorizer)
            @route.get()
            index(@bind.custom(customBinder) @val.custom(customValidator) data: string) {
                spy("action")
                return { hello: "world" }
            }
        }

        const koa = await new Plumier()
            .set(new WebApiFacility({ controller: AnimalController }))
            .set(new JwtAuthFacility({ secret: SECRET }))
            .set({mode: "production"})
            .use(createMdw("global 1"))
            .use(createMdw("global 2"))
            .use(createMdw("action 1"), "Action")
            .use(createMdw("action 2"), "Action")
            .initialize()

        await supertest(koa.callback())
            .get("/animal/index?data=abcd")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(200, { hello: "world" })
        expect(spy.mock.calls).toMatchSnapshot()
    })


    it("Should provide correct parameter binding value", async () => {
        const spy = jest.fn()
        const SECRET = "abcd"
        const USER_TOKEN = sign({ email: "ketut@gmail.com", role: "user" }, SECRET)


        const customAuthorizer: AuthorizerFunction = i => {
            spy("authorizer")
            spy("parameters:", i.ctx.parameters)
            return true
        }

        const customValidator: CustomValidatorFunction = (x, i) => {
            spy("validator")
            spy("parameters:", i.ctx.parameters)
            return undefined
        }

        class AnimalController {
            @authorize.custom(customAuthorizer)
            @route.get()
            index(@val.custom(customValidator) data: number) {
                spy("action")
                return { hello: "world" }
            }
        }

        const koa = await new Plumier()
            .set(new WebApiFacility({ controller: AnimalController }))
            .set(new JwtAuthFacility({ secret: SECRET }))
            .set({mode: "production"})
            .initialize()

        await supertest(koa.callback())
            .get("/animal/index?data=123")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(200, { hello: "world" })
        expect(spy.mock.calls).toMatchSnapshot()
    })
})