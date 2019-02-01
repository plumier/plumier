import { domain, route } from "@plumjs/core"
import { val } from "@plumjs/plumier"
import Supertest from "supertest"

import { fixture } from "../../helper"

describe("Required Is Mandatory", () => {
    it("Parameter should be mandatory by default", async () => {
        class AnimalController {
            get(email: string) { }
        }
        const koa = await fixture(AnimalController).initialize()
        const result = await Supertest(koa.callback())
            .get("/animal/get")
            .expect(422, [
                {
                    "messages": ["Required"],
                    "path": ["email"]
                }])
    })

    it("Should validate model with correct path", async () => {
        @domain()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean
            ) { }
        }
        class AnimalController {
            @route.post()
            get(model: AnimalModel) { }
        }
        const koa = await fixture(AnimalController).initialize()
        let result = await Supertest(koa.callback())
            .post("/animal/get")
            .send({ id: "123", name: "Mimi" })
            .expect(422, [
                {
                    "messages": ["Required"],
                    "path": ["model", "deceased"]
                }])
    })

    it("Should validate nested model with correct path", async () => {
        @domain()
        class TagModel {
            constructor(public name: string, public id: number) { }
        }
        @domain()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string,
                public tag: TagModel
            ) { }
        }
        class AnimalController {
            @route.post()
            get(model: AnimalModel) { }
        }
        const koa = await fixture(AnimalController).initialize()
        let result = await Supertest(koa.callback())
            .post("/animal/get")
            .send({ id: "123", name: "Mimi", tag: { name: "The Tag" } })
            .expect(422, [
                {
                    "messages": ["Required"],
                    "path": ["model", "tag", "id"]
                }])
    })
})

describe("Validation", () => {
    it("Should validate parameter", async () => {
        class AnimalController {
            get(@val.email() email: string) { }
        }
        const koa = await fixture(AnimalController).initialize()
        const result = await Supertest(koa.callback())
            .get("/animal/get?email=hello")
            .expect(422)
        expect(result.body).toMatchObject([
            {
                "messages": ["Invalid email address"],
                "path": ["email"]
            }])
    })
})

describe("Decouple Validation Logic", () => {
    it("Should validate using decouple logic", async () => {
        function only18Plus() {
            return val.custom("18+only")
        }
        @domain()
        class Person {
            constructor(
                @only18Plus()
                public age: number
            ) { }
        }
        class PersonController {
            @route.post()
            save(data: Person) { }
        }
        const koa = await fixture(PersonController, {
            validators: {
                "18+only": async val => parseInt(val) > 18 ? undefined : "Only 18+ allowed"
            }
        }).initialize()
        const result = await Supertest(koa.callback())
            .post("/person/save")
            .send({ age: 9 })
            .expect(422)
        expect(result.body).toMatchObject([
            {
                messages: ["Only 18+ allowed"],
                path: ["data", "age"]
            }])
    })
})