import { ActionResult, route, val } from "@plumier/core"
import "@plumier/testing"
import { cleanupConsole } from "@plumier/testing"
import { LoggerFacility } from "plumier"
import supertest from "supertest"
import { fixture } from "../helper"

describe("Logger", () => {
    function createApp() {
        class UsersController {
            error() {
                throw new Error("Lorem ipsum dolor")
            }
            @route.post("")
            save(name: string, @val.email() email: string) {
                return { name, email }
            }
            @route.get(":id")
            get(id: string) {
                return { id }
            }
        }
        return fixture(UsersController, { mode: "debug" })
            .set(new LoggerFacility())
            .initialize()
    }
    it("Should log success request", async () => {
        const mock = console.mock()
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users/123")
            .expect(200, { id: "123" })
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        console.mockClear()
    })
    it("Should log post request", async () => {
        const mock = console.mock()
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .post("/users")
            .send({ name: "Mimi", email: "mimi.cute@gmail.com" })
            .expect(200)
        expect(body).toMatchSnapshot()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        console.mockClear()
    })
    it("Should log 404 request", async () => {
        const mock = console.mock()
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users-data")
            .expect(404)
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        console.mockClear()
    })
    it("Should log invalid validation request", async () => {
        const mock = console.mock()
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .post("/users")
            .send({ name: "Mimi", email: "mimi" })
            .expect(422)
        expect(body).toMatchSnapshot()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        console.mockClear()
    })
    it("Should log internal error request", async () => {
        const mock = console.mock()
        const app = await createApp()
        app.on("error", () => { })
        await supertest(app.callback())
            .get("/users/error")
            .expect(500)
        expect(cleanupConsole([mock.mock.calls[6]])).toMatchSnapshot()
        expect(mock.mock.calls[7][0]).toContain("at UsersController.error")
        console.mockClear()
    })
    it("Should log action without status", async () => {
        class UsersController {
            @route.get(":id")
            get(id: string) {
                return { id }
            }
        }
        const mock = console.mock()
        const app = await fixture(UsersController, { mode: "debug" })
            .set(new LoggerFacility())
            .use(async x => {
                return new ActionResult({})
            })
            .initialize()
        await supertest(app.callback())
            .get("/users/custom")
            .expect(200)
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        console.mockClear()
    })
    it("Should disabled on production mode", async () => {
        class UsersController {
            @route.get(":id")
            get(id: string) {
                return { id }
            }
        }
        const mock = console.mock()
        const app = await fixture(UsersController, { mode: "production" })
            .set(new LoggerFacility())
            .initialize()
        await supertest(app.callback())
            .get("/users/123")
            .expect(200)
        expect(mock.mock.calls).toMatchSnapshot()
        console.mockClear()
    })
})