import { domain, route } from "@plumjs/core"
import { val } from "@plumjs/plumier"
import Supertest from "supertest"

import { fixture } from "../../helper"

/*
/Users/ketutsandiarsa/Documents/plum/plumier/packages/plumier/test/integration/application/assets/index.html
/Users/ketutsandiarsa/Documents/plum/plumier/Users/ketutsandiarsa/Documents/plum/plumier/packages/plumier/test/integration/application/assets/index.html
/Users/ketutsandiarsa/Documents/plum/plumier/packages/plumier/test/integration/application/serve-file.spec.ts
*/

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