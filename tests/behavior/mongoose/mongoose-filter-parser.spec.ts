import { authorize, Class, route } from "@plumier/core"
import { createCustomConverter, filterParser } from "@plumier/filter-parser"
import { collection, filterConverter, MongooseFacility } from "@plumier/mongoose"
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
        age: number
    }
    class UsersController {
        @route.get("")
        get(@filterParser(x => User) filter: any) {
            return filter
        }
    }
    function createApp(controller?: Class) {
        return new Plumier()
            .set({ mode: "production" })
            .set(new WebApiFacility({ controller: controller ?? UsersController }))
            .set(new MongooseFacility())
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
        it("Should parse equal operator with reverse", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter='ipsum'=name")
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
        it("Should parse equals operator with null", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=name=null")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse number range", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=name=17...30")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse date range", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=createdAt='2020-1-1'...'2021-1-1'")
                .expect(200)
            expect(body.$and[0]).toMatchSnapshot({ createdAt: { $gte: expect.any(String) } })
            expect(body.$and[1]).toMatchSnapshot({ createdAt: { $lte: expect.any(String) } })
        })
        it("Should parse not equal operator", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=name!='ipsum'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse not equal with null", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=name!=null")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse greater operator", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=age>20")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse greater or equals operator", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=age>=20")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse less operator", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=age<20")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse less or equals operator", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=age<=20")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse and operator", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=age<=20 and name='john'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse or operator", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=age<=20 or name='john'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse not operator", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=!age<=20")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should invalid when provided not operator on logical operator", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/users?filter=!(age<=20 or name='john')")
                .expect(422)
            expect(body).toMatchSnapshot()
        })
        it("Should able to query relation", async () => {
            @collection()
            class Child {
                @collection.id()
                id: string
                @noop()
                name: string
            }
            @collection()
            class Parent {
                @collection.id()
                id: string

                @authorize.filter()
                @collection.ref(x => Child)
                child: Child
            }
            class ParentsController {
                @route.get("")
                get(@filterParser(x => Parent) filter: any) {
                    return filter
                }
            }
            const app = await createApp(ParentsController)
            const { body } = await supertest(app.callback())
                .get("/parents?filter=child='5099803df3f4948bd2f98391'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })
})