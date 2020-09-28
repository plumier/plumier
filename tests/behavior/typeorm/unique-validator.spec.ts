import { Class, HttpMethod, route, val } from "@plumier/core"
import { TypeORMFacility } from "@plumier/typeorm"
import supertest = require("supertest")
import { Column, Entity, getManager, PrimaryGeneratedColumn } from "typeorm"

import { fixture } from "../helper"
import { cleanup, getConn } from "./helper"

jest.setTimeout(20000)

describe("unique validator", () => {
    afterEach(async () => {
        await cleanup()
    });

    async function setup<T extends object>({ controller, domain, initUser, testUser, method }: { controller: Class; domain: Class; initUser?: T; testUser: T; method?: HttpMethod }) {
        const httpMethod = method || "post"
        const koa = await fixture(controller)
            .set(new TypeORMFacility({ connection: getConn([domain]) })).initialize()
        koa.on("error", () => { })
        //setup user
        const repo = getManager().getRepository(domain)
        await repo.delete({})
        if (!!initUser)
            await repo.insert({...initUser})
        if (httpMethod !== "post")
            await repo.insert({...testUser})
        //test
        return await supertest(koa.callback())
        [httpMethod || "post"]("/user/save")
            .send(testUser)
    }

    it("Should return invalid if data already exist", async () => {
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id:number
            @Column()
            public name: string
            @Column()
            @val.unique()
            public email: string
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
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id:number
            @Column()
            public name: string
            @Column()
            @val.unique()
            public email: string
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

    it("Should not check if partial part provided", async () => {
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id:number
            @Column()
            public name: string
            @Column()
            @val.unique()
            public email: string
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
        expect(res.status).toBe(200)
    })

    it("Should return valid if data not exist", async () => {
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id:number
            @Column()
            public name: string
            @Column()
            @val.unique()
            public email: string
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
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id:number
            @Column()
            public name: string
            @Column()
            @val.unique()
            public email: string
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
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id:number
            @Column()
            public name: string
            @Column()
            @val.unique()
            public email: string
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
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id:number
            @Column()
            public name: string
            @Column()
            @val.unique()
            public email: string
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
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id:number
            @Column()
            public name: string
            @Column()
            @val.unique()
            public email: string
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
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id:number
            @Column()
            public name: string
            @Column()
            @val.unique()
            public email: string
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
})