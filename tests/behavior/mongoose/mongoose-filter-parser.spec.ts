import { authorize, route } from "@plumier/core"
import { createFilterConverter, filterParser } from "@plumier/filter-parser"
import { filterConverter } from "@plumier/mongoose"
import Plumier, { WebApiFacility } from "@plumier/plumier"
import { noop } from "@plumier/reflect"
import { val } from "@plumier/validator"
import supertest from "supertest"



describe("Mongoose Filter Parser", () => {
    @authorize.filter()
    class User {
        @val.email()
        @noop()
        email: string
        @noop()
        name: string
        @noop()
        deleted: boolean
        @noop()
        createdAt: Date
        @noop()
        age:number
    }
    class UsersController {
        @route.get("")
        get(@filterParser(x => User) filter: any, index: number) {
            return filter
        }
    }
    function createApp() {
        return new Plumier()
            .set({ mode: "production" })
            .set(new WebApiFacility({ controller: UsersController }))
            .set({ typeConverterVisitors: [filterConverter] })
            .initialize()
    }
    
    describe("Comparison", () => {
        it("Should parse equal operator", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=name='ipsum'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse starts with string", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=name='ipsum'*")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse ends with string", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=name=*'ipsum'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse contains string", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=name=*'ipsum'*")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse number range", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=name=17 to 30")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse date range", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=createdAt='2020-1-1' to '2021-1-1'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse not equal operator", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=name!='ipsum'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })
})