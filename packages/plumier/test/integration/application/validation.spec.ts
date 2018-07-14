import { val, model, route } from "../../../src";
import { fixture } from '../../helper';
import Supertest from "supertest"

describe("Validation", () => {
    it("Should validate parameter", async () => {
        class AnimalController {
            get(@val.email() email: string) { }
        }
        const koa = await fixture(AnimalController).initialize()
        const result = await Supertest(koa.callback())
            .get("/animal/get?email=hello")
            .expect(400)
        expect(result.body).toMatchObject([
            {
                "messages": ["Invalid email address"],
                "path": ["email"]
            }])
    })

    it("Should validate required", async () => {
        class AnimalController {
            get(@val.required() email: string) { }
        }
        const koa = await fixture(AnimalController).initialize()
        const result = await Supertest(koa.callback())
            .get("/animal/get")
            .expect(400)
        expect(result.body).toMatchObject([
            {
                "messages": ["Required"],
                "path": ["email"]
            }])
    })

    it("Should validate nested object", async () => {
        @model()
        class AnimalModel {
            constructor(
                @val.required()
                public id: number,
                @val.required()
                public name: string,
                public deceased:boolean
            ) { }
        }
        class AnimalController {
            @route.post()
            get(@val.required() model: AnimalModel) { }
        }
        const koa = await fixture(AnimalController).initialize()
        let result = await Supertest(koa.callback())
            .post("/animal/get")
            .send({ id: "123", name: "Mimi" })
            .expect(200)
        result = await Supertest(koa.callback())
            .post("/animal/get")
            .send({ name: "Mimi" })
            .expect(400)
        expect(result.body).toMatchObject([
            {
                "messages": ["Required"],
                "path": ["model", "id"]
            }])
        result = await Supertest(koa.callback())
            .post("/animal/get")
            .expect(400)
        expect(result.body).toMatchObject([
            { "messages": ["Required"], "path": ["model", "id"] },
            { "messages": ["Required"], "path": ["model", "name"] }
        ])

    })
})