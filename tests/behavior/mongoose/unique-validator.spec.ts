import { Class, route, val, HttpMethod } from "@plumier/core"
import { collection, model, MongooseFacility } from "@plumier/mongoose"
import Mongoose from "mongoose"
import { fixture } from "../helper"
import supertest = require("supertest")
import { decorate } from "tinspector"
import { MongoMemoryServer } from 'mongodb-memory-server-global'

const timeout = 10000;
async function setup<T extends object>({ controller, domain, initUser, testUser, method }: { controller: Class; domain: Class; initUser?: T; testUser: T; method?: HttpMethod }) {
    const mongod = new MongoMemoryServer()
    const httpMethod = method || "post"
    const koa = await fixture(controller)
        .set(new MongooseFacility({
            uri: await mongod.getUri()
        })).initialize()
    koa.on("error", () => { })
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

describe("unique validator", () => {
    beforeEach(() => Mongoose.models = {})
    afterAll(async () => await Mongoose.disconnect())

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
    }, timeout)

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
    }, timeout)

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
    }, timeout)

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
    }, timeout)

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
    }, timeout)

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
    }, timeout)

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
    }, timeout)

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
    }, timeout)

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
    }, timeout)
})