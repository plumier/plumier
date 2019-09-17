import { ActionResult, response } from "plumier"
import Supertest from "supertest"

import { fixture } from "../../helper"

describe("Return value", () => {
    it("Should able to return string", async () => {
        class AnimalController {
            method() {
                return "Hello world!"
            }
        }
        const app = await fixture(AnimalController).initialize()
        await Supertest(app.callback())
            .get("/animal/method")
            .expect(200, "Hello world!")
    })

    it("Should able to return promise", async () => {
        class AnimalController {
            method() {
                return Promise.resolve("Hello world!")
            }
        }
        const app = await fixture(AnimalController).initialize()
        await Supertest(app.callback())
            .get("/animal/method")
            .expect(200, "Hello world!")
    })

    it("Should able using async method", async () => {
        class AnimalController {
            async method() {
                return "Hello world!"
            }
        }
        const app = await fixture(AnimalController).initialize()
        await Supertest(app.callback())
            .get("/animal/method")
            .expect(200, "Hello world!")
    })

    it("Should able return action result with specific status code", async () => {
        class AnimalController {
            method() {
                return new ActionResult("Hello world!", 201)
            }
        }
        const app = await fixture(AnimalController).initialize()
        await Supertest(app.callback())
            .get("/animal/method")
            .expect(201, "Hello world!")
    })

    it("Should able return action result with specific status code using response helper", async () => {
        class AnimalController {
            method() {
                return response.json({ message: "Hello" })
                    .setStatus(201)
            }
        }
        const app = await fixture(AnimalController).initialize()
        await Supertest(app.callback())
            .get("/animal/method")
            .expect(201, { message: "Hello" })
    })

    it("Should able to set header from action result", async () => {
        class AnimalController {
            method() {
                return new ActionResult("Hello world!")
                    .setHeader("x-api-key", "YOUR_SECRETE_API_KEY")
            }
        }
        const app = await fixture(AnimalController).initialize()
        const result = await Supertest(app.callback())
            .get("/animal/method")
            .expect(200, "Hello world!")
        expect(result.header["x-api-key"]).toBe("YOUR_SECRETE_API_KEY")
    })

    it("Should return status 200 for default action result status code", async () => {
        class AnimalController {
            method() {
                return new ActionResult("Hello world!")
            }
        }
        const app = await fixture(AnimalController).initialize()
        await Supertest(app.callback())
            .get("/animal/method")
            .expect(200, "Hello world!")
    })

    it("Should able return promised action result", async () => {
        class AnimalController {
            method() {
                return Promise.resolve(new ActionResult("Hello world!", 201))
            }
        }
        const app = await fixture(AnimalController).initialize()
        await Supertest(app.callback())
            .get("/animal/method")
            .expect(201, "Hello world!")
    })

    it("Should able return action result in async method", async () => {
        class AnimalController {
            async method() {
                return new ActionResult("Hello world!", 201)
            }
        }
        const app = await fixture(AnimalController).initialize()
        await Supertest(app.callback())
            .get("/animal/method")
            .expect(201, "Hello world!")
    })
})
