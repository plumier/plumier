import { Class, HttpMethod, route, val } from "@plumier/core"
import { collection, model, MongooseFacility, MongooseHelper } from "@plumier/mongoose"
import { MongoMemoryServer } from "mongodb-memory-server-global"
import Mongoose from "mongoose"
import supertest = require("supertest")
import { decorate } from "tinspector"

import { fixture } from "../helper"

Mongoose.set("useNewUrlParser", true)
Mongoose.set("useUnifiedTopology", true)
Mongoose.set("useFindAndModify", false)

jest.setTimeout(20000)

describe("unique validator", () => {
    beforeEach(() => (Mongoose as any).models = {})
    afterAll(async () => await Mongoose.disconnect())
    beforeAll(async () => {
        const mongod = new MongoMemoryServer()
        await Mongoose.connect(await mongod.getUri())
    })

    async function setup<T extends object>({ controller, domain, initUser, testUser, method }: { controller: Class; domain: Class; initUser?: T; testUser: T; method?: HttpMethod }) {
        const httpMethod = method || "post"
        const koa = await fixture(controller)
            .set(new MongooseFacility()).initialize()
        //koa.on("error", () => { })
        //setup user
        const UserModel = model(domain)
        await UserModel.deleteMany({})
        if (!!initUser)
            await new UserModel(initUser).save()
        if (httpMethod !== "post")
            await new UserModel(testUser).save()
        //test
        return await supertest(koa.callback())
        [httpMethod || "post"]("/user/save")
            .send(testUser)
    }

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

    it.only("Should not check if partial part provided", async () => {
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
            testUser: { name: "Ketut", email: "ketut" }
        })
        expect(res.status).toBe(500)
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

    it("Should check on PUT method", async () => {
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
        const res = await setup({
            controller: UserController,
            domain: User,
            initUser: user,
            testUser: user,
            method: "put"
        })
        expect(res.status).toBe(422)
        expect(res.body).toEqual({ status: 422, message: [{ messages: ["ketut@gmail.com already exists"], path: ["user", "email"] }] })
    })

    it("Should check on PATCH method", async () => {
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
        expect(res.status).toBe(422)
        expect(res.body).toEqual({ status: 422, message: [{ messages: ["ketut@gmail.com already exists"], path: ["user", "email"] }] })
    })

    it("Should able to use isolated helper", async () => {
        const mongod = new MongoMemoryServer()
        const helper = new MongooseHelper()
        @collection()
        class Animal {
            constructor(
                public name: string,
            ) { }
        }
        helper.model(Animal)
        @collection()
        class User {
            constructor(
                public name: string,
                @val.unique(helper)
                public email: string,
                @collection.ref(x => [Animal])
                public animals: Animal[]
            ) { }
        }
        const UserModel = helper.model(User)
        class UserController {
            @route.post()
            save(user: User) { }
        }
        const koa = await fixture(UserController)
            .set(new MongooseFacility({
                uri: await mongod.getUri(),
                helper
            })).initialize()
        //setup user
        const user = { name: "Ketut", email: "ketut@gmail.com" }
        await UserModel.deleteMany({})
        await new UserModel(user).save()
        //test
        const res = await supertest(koa.callback())
            .post("/user/save")
            .send(user)
        expect(res.status).toBe(422)
        expect(res.body).toEqual({ status: 422, message: [{ messages: ["ketut@gmail.com already exists"], path: ["user", "email"] }] })
        await helper.disconnect()
    })
})