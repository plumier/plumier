import { HttpStatusError, middleware, Class, ActionResult, route } from "@plumier/core"
import { join } from "path"
import Supertest from "supertest"

import { fixture } from "../helper"
import Plumier, { WebApiFacility } from '@plumier/plumier';


describe("Error Handling", () => {
    it("Should able to throw general Error from inside action", async () => {
        class AnimalController {
            get() {
                throw new Error("Error occur")
            }
        }
        const koa = await fixture(AnimalController).initialize()
        koa.on("error", () => { })
        await Supertest(koa.callback())
            .get("/animal/get")
            .expect(500, "Internal Server Error")
    })

    it("Should able to throw Http Status Error from inside action", async () => {
        class AnimalController {
            get() {
                throw new HttpStatusError(400, "Invalid data")
            }
        }
        const koa = await fixture(AnimalController).initialize()
        await Supertest(koa.callback())
            .get("/animal/get")
            .expect(400, { status: 400, message: "Invalid data" })
    })

    it("Should able to throw general Error from inside global middleware", async () => {
        class AnimalController {
            get() {
                return "Body"
            }
        }
        const koa = await fixture(AnimalController)
            .use({ execute: async x => { throw new Error("Error occur") } })
            .initialize()
        koa.on("error", () => { })
        await Supertest(koa.callback())
            .get("/animal/get")
            .expect(500)
    })

    it("Should able to throw Http Status Error from inside global middleware", async () => {
        class AnimalController {
            get() {
                return "Body"
            }
        }
        const koa = await fixture(AnimalController)
            .use({ execute: async x => { throw new HttpStatusError(400, "Invalid data") } })
            .initialize()
        await Supertest(koa.callback())
            .get("/animal/get")
            .expect(400)
    })

    it("Should able to throw general Error from inside controller middleware", async () => {
        @middleware.use({ execute: async x => { throw new Error("Error occur") } })
        class AnimalController {
            get() {
                return "Body"
            }
        }
        const koa = await fixture(AnimalController)
            .initialize()
        koa.on("error", () => { })
        await Supertest(koa.callback())
            .get("/animal/get")
            .expect(500)
    })

    it("Should able to throw Http Status Error from inside controller middleware", async () => {
        @middleware.use({ execute: async x => { throw new HttpStatusError(400, "Invalid data") } })
        class AnimalController {
            get() {
                return "Body"
            }
        }
        const koa = await fixture(AnimalController)
            .initialize()
        await Supertest(koa.callback())
            .get("/animal/get")
            .expect(400)
    })

    it("Should able to throw general Error from inside action middleware", async () => {
        class AnimalController {
            @middleware.use({ execute: async x => { throw new Error("Error occur") } })
            get() {
                return "Body"
            }
        }
        const koa = await fixture(AnimalController)
            .initialize()
        koa.on("error", () => { })
        await Supertest(koa.callback())
            .get("/animal/get")
            .expect(500)
    })

    it("Should able to throw Http Status Error from inside action middleware", async () => {
        class AnimalController {
            @middleware.use({ execute: async x => { throw new HttpStatusError(400, "Invalid data") } })
            get() {
                return "Body"
            }
        }
        const koa = await fixture(AnimalController)
            .initialize()
        await Supertest(koa.callback())
            .get("/animal/get")
            .expect(400)
    })

    it("Should handle 404", async () => {
        class AnimalController {
            get() {
                return "Body"
            }
        }
        const koa = await fixture(AnimalController)
            .initialize()
        await Supertest(koa.callback())
            .get("/animal/list")
            .expect(404)
    })

    it("Should show correct error if provided controller folder not found", async () => {
        const koa = fixture(join(__dirname, "controller"))
        expect(koa.initialize()).rejects.toThrow("PLUM1002")
    })

    it("Should show correct error if provided controller file not found", async () => {
        const koa = fixture(join(__dirname, "controller/animal-controller.ts"))
        expect(koa.initialize()).rejects.toThrow("PLUM1002")
    })
})


function errorFixture(controller: Class) {
    return new Plumier()
        .use({
            execute: async i => {
                try {
                    return await i.proceed()
                } catch (e) {
                    return new ActionResult({
                        customError: {
                            status: e.status,
                            message: e.message
                        }
                    }, e.status)
                }
            }
        })
        .set({ mode: "production" })
        .set(new WebApiFacility({ controller }))
        .initialize()
}

describe("Global Error Handling", () => {
    it("Should able handle HttpStatusError properly", async () => {
        class AnimalController {
            @route.get()
            index() { throw new HttpStatusError(400, "Unable to convert") }
        }
        const koa = await errorFixture(AnimalController)
        const result = await Supertest(koa.callback())
            .get("/animal/index")
            .expect(400)
        expect(result.body).toMatchSnapshot()
    })

    it("Should able handle Validation Error properly", async () => {
        class AnimalController {
            @route.get()
            index(page: number) { return { page } }
        }
        const koa = await errorFixture(AnimalController)
        const result = await Supertest(koa.callback())
            .get("/animal/index?page=aloha")
            .expect(422)
        expect(result.body).toMatchSnapshot()
    })
})