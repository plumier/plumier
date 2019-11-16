import { OpenApiFacility, OpenApiFacilityConfiguration } from "@plumier/swagger"
import Plumier, { Class, WebApiFacility, route } from "plumier"
import supertest = require("supertest")

export function appStub(controller: Class | Class[] | string, opt?: OpenApiFacilityConfiguration) {
    return new Plumier()
        .set({ mode: "production" })
        .set(new WebApiFacility({ controller }))
        .set(new OpenApiFacility(opt))
        .initialize()
}

describe("Open API Paths", () => {
    it("Should provide path on controller convention", async () => {
        class AnimalController {
            index() { }
        }
        const app = await appStub(AnimalController)
        const { body } = await supertest(app.callback())
            .get("/swagger.json")
            .expect(200)
        expect(body.paths).toMatchSnapshot()
    })

    it("Should provide correct path template", async () => {
        class AnimalController {
            @route.get(":id")
            index(id: string) { }
        }
        const app = await appStub(AnimalController)
        const { body } = await supertest(app.callback())
            .get("/swagger.json")
            .expect(200)
        expect(body.paths).toMatchSnapshot()
    })

    it("Should provide correct path template in nested route", async () => {
        @route.root("/users/:userId/animals")
        class AnimalController {
            @route.get(":id")
            index(id: string) { }
        }
        const app = await appStub(AnimalController)
        const { body } = await supertest(app.callback())
            .get("/swagger.json")
            .expect(200)
        expect(body.paths).toMatchSnapshot()
    })

    it("Should response http method on controller decorated with @route.get()", async () => {
        class AnimalController {
            @route.get("")
            get() { }
        }
        const app = await appStub(AnimalController)
        const { body } = await supertest(app.callback())
            .get("/swagger.json")
            .expect(200)
        expect(body.paths).toMatchSnapshot()
    })

    it("Should response http method on controller decorated with @route.post()", async () => {
        class AnimalController {
            @route.post("")
            post() { }
        }
        const app = await appStub(AnimalController)
        const { body } = await supertest(app.callback())
            .get("/swagger.json")
            .expect(200)
        expect(body.paths).toMatchSnapshot()
    })

    it("Should response http method on controller decorated with @route.put()", async () => {
        class AnimalController {
            @route.put("")
            put() { }
        }
        const app = await appStub(AnimalController)
        const { body } = await supertest(app.callback())
            .get("/swagger.json")
            .expect(200)
        expect(body.paths).toMatchSnapshot()
    })

    it("Should response http method on controller decorated with @route.patch()", async () => {
        class AnimalController {
            @route.patch("")
            patch() { }
        }
        const app = await appStub(AnimalController)
        const { body } = await supertest(app.callback())
            .get("/swagger.json")
            .expect(200)
        expect(body.paths).toMatchSnapshot()
    })

    it("Should response http method on controller decorated with @route.delete()", async () => {
        class AnimalController {
            @route.delete("")
            delete() { }
        }
        const app = await appStub(AnimalController)
        const { body } = await supertest(app.callback())
            .get("/swagger.json")
            .expect(200)
        expect(body.paths).toMatchSnapshot()
    })

    it("Should response http method on controller decorated with @route.head()", async () => {
        class AnimalController {
            @route.head("")
            head() { }
        }
        const app = await appStub(AnimalController)
        const { body } = await supertest(app.callback())
            .get("/swagger.json")
            .expect(200)
        expect(body.paths).toMatchSnapshot()
    })

    it("Should response http method on controller decorated with @route.options()", async () => {
        class AnimalController {
            @route.options("")
            options() { }
        }
        const app = await appStub(AnimalController)
        const { body } = await supertest(app.callback())
            .get("/swagger.json")
            .expect(200)
        expect(body.paths).toMatchSnapshot()
    })

    it("Should response http method on controller decorated with @route.trace()", async () => {
        class AnimalController {
            @route.trace("")
            trace() { }
        }
        const app = await appStub(AnimalController)
        const { body } = await supertest(app.callback())
            .get("/swagger.json")
            .expect(200)
        expect(body.paths).toMatchSnapshot()
    })
})
