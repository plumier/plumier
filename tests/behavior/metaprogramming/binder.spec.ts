import { CustomAuthorizerFunction, route, authorize, CustomBinderFunction, bind } from "@plumier/core"
import { fixture } from "../helper"
import supertest from "supertest"



describe("Parameter Binder", () => {
    it("Should able to access metadata from custom parameter binder", async () => {
        const secret = "secret"
        const fn = jest.fn()
        const customBinder: CustomBinderFunction = (ctx, metadata) => {
            fn(metadata)
            return ctx.query.id
        }
        class AnimalController {
            @route.get()
            get(@bind.custom(customBinder) id: number) { return { id } }
        }
        const app = await fixture(AnimalController)
            .initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234")
            .expect(200, { id: 1234 })
        expect(fn.mock.calls).toMatchSnapshot()
    })
})