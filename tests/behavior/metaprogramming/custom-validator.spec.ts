import { CustomValidatorFunction, route, val, domain } from "@plumier/core"
import supertest from "supertest"

import { fixture } from "../helper"

describe("Custom Validator", () => {
    it("Should able to access metadata from custom validator", async () => {
        const fn = jest.fn()
        const greaterThan18: CustomValidatorFunction = (x, { metadata }) => {
            fn(metadata)
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

    it("Should able to access actionParams", async () => {
        const fn = jest.fn()
        const greaterThan18: CustomValidatorFunction = (x, { metadata }) => {
            fn(metadata.actionParams)
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

    it("Should able to access current from nested property", async () => {
        const greaterThan18: CustomValidatorFunction = (x, { metadata }) => {
            fn(metadata.current)
            return x < 18 ? "Not allowed" : undefined
        }
        @domain()
        class Human {
            constructor(
                @val.custom(greaterThan18)
                public age: number) { }
        }
        const fn = jest.fn()

        class AnimalController {
            @route.post()
            save(data: Human) { return { data } }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .post("/animal/save")
            .send({ age: 1234 })
            .expect(200, { data: { age: 1234 } })
        expect(fn.mock.calls).toMatchSnapshot()
    })
})