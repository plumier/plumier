import { val, route, consoleLog, cleanupConsole, ActionResult } from "@plumier/core"
import { fixture } from '../helper'
import { LoggerFacility } from '@plumier/plumier'
import supertest from 'supertest'


describe("Logger", () => {
    function createApp() {
        class UsersController {
            error(){
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
        return fixture(UsersController)
            .set(new LoggerFacility())
            .initialize()
    }
    it("Should log success request", async () => {
        const app = await createApp()
        const mock = consoleLog.startMock()
        const {body} = await supertest(app.callback())
            .get("/users/123")
            .expect(200, {id: "123"})
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })
    it("Should log post request", async () => {
        const app = await createApp()
        const mock = consoleLog.startMock()
        const {body} = await supertest(app.callback())
            .post("/users")
            .send({ name: "Mimi", email: "mimi.cute@gmail.com"})
            .expect(200)
        expect(body).toMatchSnapshot()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })
    it("Should log 404 request", async () => {
        const app = await createApp()
        const mock = consoleLog.startMock()
        const {body} = await supertest(app.callback())
            .get("/users-data")
            .expect(404)
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })
    it("Should log invalid validation request", async () => {
        const app = await createApp()
        const mock = consoleLog.startMock()
        const {body} = await supertest(app.callback())
            .post("/users")
            .send({ name: "Mimi", email: "mimi"})
            .expect(422)
        expect(body).toMatchSnapshot()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })
    it("Should log internal error request", async () => {
        const app = await createApp()
        const mock = consoleLog.startMock()
        app.on("error", () => {})
        await supertest(app.callback())
            .get("/users/error")
            .expect(500)
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })
    it("Should log action without status", async () => {
        class UsersController {
            @route.get(":id")
            get(id: string) {
                return { id }
            }
        }
        const app = await fixture(UsersController)
            .set(new LoggerFacility())
            .use(async x => {
                return new ActionResult({})
            })
            .initialize()
        const mock = consoleLog.startMock()

        await supertest(app.callback())
            .get("/users/custom")
            .expect(200)
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        consoleLog.clearMock()
    })
})