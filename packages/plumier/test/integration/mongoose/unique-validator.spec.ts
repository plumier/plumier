import { Class, route, val, HttpMethod } from "@plumier/core"
import { collection, Constructor, model, MongooseFacility } from "@plumier/mongoose"
import Mongoose from "mongoose"
import { fixture } from "plumier/test/helper"
import supertest = require("supertest")
import { decorate } from "tinspector"

async function setup<T extends object>({ controller, domain, initUser, testUser, method }: { controller: Class; domain: Constructor<T>; initUser?: T; testUser: T; method?: HttpMethod }) {
    const koa = await fixture(controller)
        .set(new MongooseFacility({
            model: [domain],
            uri: "mongodb://localhost:27017/test-data"
        })).initialize()
    koa.on("error", () => { })
    //setup user
    const UserModel = model(domain)
    await UserModel.deleteMany({})
    if (!!initUser)
        await new UserModel(initUser).save()
    //test
    return await supertest(koa.callback())
    [method || "post"]("/user/save")
        .send(testUser)
}

describe("unique validator", () => {
    afterEach(async () => await Mongoose.disconnect())

    it("Should return invalid if data already exist", async () => {
        @collection()
        class User {
            constructor(
                public name: string,
                @val.unique()
                public email: string
            ) { }
        }
        class UserController {
            @route.post()
            save(user: User) { }
        }

        const user = { name: "Ketut", email: "ketut@gmail.com" }
        const res = await setup({ controller: UserController, domain: User, initUser: user, testUser: user })
        expect(res.status).toBe(422)
        expect(res.body).toEqual({ status: 422, message: [{ messages: ["ketut@gmail.com already exists"], path: ["user", "email"] }] })
    })

    it("Should return invalid if data already exist", async () => {
        @collection()
        class User {
            @decorate({})
            name: string
            @val.unique()
            email: string

            constructor(name: string, email: string) {
                this.name = name;
                this.email = email;
            }
        }
        class UserController {
            @route.post()
            save(user: User) { }
        }
        const user = { name: "Ketut", email: "ketut@gmail.com" }
        const res = await setup({ controller: UserController, domain: User, initUser: user, testUser: user })
        expect(res.status).toBe(422)
        expect(res.body).toEqual({ status: 422, message: [{ messages: ["ketut@gmail.com already exists"], path: ["user", "email"] }] })
    })

    it("Should check data with case insensitive", async () => {
        @collection()
        class User {
            constructor(
                public name: string,
                @val.unique()
                public email: string
            ) { }
        }
        class UserController {
            @route.post()
            save(user: User) { }
        }
        const res = await setup({
            controller: UserController, domain: User,
            initUser: { name: "Ketut", email: "ketut@gmail.com" },
            testUser: { name: "Ketut", email: "KETUT@gmail.com" }
        })
        expect(res.status).toBe(422)
        expect(res.body).toEqual({ status: 422, message: [{ messages: ["KETUT@gmail.com already exists"], path: ["user", "email"] }] })
    })

    it("Should return valid if data not exist", async () => {
        @collection()
        class User {
            constructor(
                public name: string,
                @val.unique()
                public email: string
            ) { }
        }
        class UserController {
            @route.post()
            save(user: User) { }
        }
        const res = await setup({
            controller: UserController, domain: User,
            testUser: { name: "Ketut", email: "ketut@gmail.com" }
        })
        expect(res.status).toBe(200)
    })

    it("Should return valid if data not exist but other data exists", async () => {
        @collection()
        class User {
            constructor(
                public name: string,
                @val.unique()
                public email: string
            ) { }
        }
        class UserController {
            @route.post()
            save(user: User) { }
        }
        const res = await setup({
            controller: UserController, domain: User,
            initUser: { name: "Ketut", email: "ketut@gmail.com" },
            testUser: { name: "Ketut", email: "m.ketut@gmail.com" }
        })
        expect(res.status).toBe(200)
    })

    it("Should return valid if data is optional and provided undefined", async () => {
        @collection()
        class User {
            constructor(
                public name: string,
                @val.optional()
                @val.unique()
                public email: string | undefined
            ) { }
        }
        class UserController {
            @route.post()
            save(user: User) { }
        }
        const res = await setup({
            controller: UserController, domain: User,
            testUser: { name: "Ketut", email: undefined }
        })
        expect(res.status).toBe(200)
    })

    it("Should throw error if applied outside class", async () => {
        @collection()
        class User {
            constructor(
                @val.optional()
                @val.unique()
                public email: string | undefined
            ) { }
        }
        class UserController {
            @route.post()
            save(@val.unique() email: string) { }
        }
        const res = await setup({
            controller: UserController, domain: User,
            testUser: { email: "ketut@gmail.com" }
        })
        expect(res.status).toBe(500)
    })

    it("Should not check on PUT method", async () => {
        @collection()
        class User {
            constructor(
                public name: string,
                @val.unique()
                public email: string
            ) { }
        }
        class UserController {
            @route.put()
            save(user: User) { }
        }

        const user = { name: "Ketut", email: "ketut@gmail.com" }
        const res = await setup({ controller: UserController, domain: User, initUser: user, testUser: user, method: "put" })
        expect(res.status).toBe(200)
    })

    it("Should not check on PATCH method", async () => {
        @collection()
        class User {
            constructor(
                public name: string,
                @val.unique()
                public email: string
            ) { }
        }
        class UserController {
            @route.patch()
            save(user: User) { }
        }

        const user = { name: "Ketut", email: "ketut@gmail.com" }
        const res = await setup({ controller: UserController, domain: User, initUser: user, testUser: user, method: "patch" })
        expect(res.status).toBe(200)
    })
})