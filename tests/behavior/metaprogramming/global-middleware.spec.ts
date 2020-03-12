import { ActionResult } from "@plumier/core"
import supertest from "supertest"

import { fixture } from "../helper"


describe("Global Middleware", () => {
    it("Should able to access metadata from global middleware", async () => {
        const fn = jest.fn()

        class AnimalController {
            get(id: string) { return { id } }
        }
        const app = await fixture(AnimalController)
            .use(x => {
                fn(x.metadata)
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
                fn(x.metadata)
                return x.proceed()
            })
            .use(async x => {
                if (x.ctx.path === "/animal/got")
                    return new ActionResult({ id: "1234" })
                return x.proceed()
            })
            .initialize()
        await supertest(app.callback())
            .get("/animal/got")
            .expect(200, { id: "1234" })
        expect(fn.mock.calls).toMatchSnapshot()
    })
})