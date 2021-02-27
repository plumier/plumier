import { authorize, route } from "@plumier/core"
import { stringFilter, stringFilterVisitor } from "@plumier/filter-parser"
import Plumier, { WebApiFacility } from "@plumier/plumier"
import { noop } from "@plumier/reflect"
import supertest from "supertest"

describe("Filter", () => {
    @authorize.filter()
    class User {
        @noop()
        name: string
        @noop()
        deleted: boolean
    }
    class UsersController {
        @route.get("")
        get(@stringFilter(User) filter: any) {
            return filter
        }
    }
    function createApp() {
        return new Plumier()
            .set({ mode: "production" })
            .set(new WebApiFacility({ controller: UsersController }))
            .set({ typeConverterVisitors: [stringFilterVisitor] })
            .initialize()
    }
    it("Should allow input string", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=(lorem='ipsum')")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should allow multiple expression", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=(lorem='ipsum') AND (dolor >= 123 OR sit = false)")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should allow input array with simple query string notation", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=(lorem='ipsum')&filter=(lorem='ipsum')")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should allow input array with simple query string notation without grouping", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=lorem='ipsum'&filter=lorem='ipsum'")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should catch expression error by 422", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=(lorem='ipsum' MUL lorem=lorem)")
            .expect(422)
        expect(body).toMatchSnapshot()
    })
})