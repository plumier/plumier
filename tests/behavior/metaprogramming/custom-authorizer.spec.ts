import { authorize, CustomAuthorizerFunction, route, domain, authPolicy } from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import { noop, type } from '@plumier/reflect'
import { sign } from "jsonwebtoken"
import supertest from "supertest"

import { fixture } from "../helper"


describe("Custom Authorizer", () => {
    it("Should able to access metadata from custom authorizer", async () => {
        const secret = "secret"
        const token = sign({ id: 123, role: "User" }, secret)
        const fn = jest.fn()
        const authPolicies = authPolicy().define("custom", ({ metadata }) => {
            fn(metadata)
            return true
        })
        class AnimalController {
            @route.get()
            @authorize.route("custom")
            get(id: number) { return { id } }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret, authPolicies }))
            .initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234")
            .set({ Authorization: `Bearer ${token}` })
            .expect(200, { id: 1234 })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to access actionParams", async () => {
        const secret = "secret"
        const token = sign({ id: 123, role: "User" }, secret)
        const fn = jest.fn()
        const authPolicies = authPolicy().define("custom", ({ metadata }) => {
            fn(metadata.actionParams)
            return true
        })
        @authorize.route("custom")
        class AnimalController {
            @route.get()
            get(id: number) { return { id } }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret, authPolicies }))
            .initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234")
            .set({ Authorization: `Bearer ${token}` })
            .expect(200, { id: 1234 })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to access current metadata on constructor", async () => {
        const secret = "secret"
        const token = sign({ id: 123, role: "User" }, secret)
        const fn = jest.fn()
        const authPolicies = authPolicy().define("custom", ({ metadata }) => {
            fn(metadata.current)
            return true
        })
        @authorize.route("custom")
        class AnimalController {
            @route.get()
            get(id: number) { return { id } }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret, authPolicies }))
            .initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234")
            .set({ Authorization: `Bearer ${token}` })
            .expect(200, { id: 1234 })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to access current metadata on method", async () => {
        const secret = "secret"
        const token = sign({ id: 123, role: "User" }, secret)
        const fn = jest.fn()
        const authPolicies = authPolicy().define("custom", ({ metadata }) => {
            fn(metadata.current)
            return true
        })
        class AnimalController {
            @route.get()
            @authorize.route("custom")
            get(id: number) { return { id } }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret, authPolicies }))
            .initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234")
            .set({ Authorization: `Bearer ${token}` })
            .expect(200, { id: 1234 })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to access current metadata on parameter", async () => {
        const secret = "secret"
        const token = sign({ id: 123, role: "User" }, secret)
        const fn = jest.fn()
        const authPolicies = authPolicy().define("custom", ({ metadata }) => {
            fn(metadata.current)
            return true
        })
        class AnimalController {
            @route.post()
            save(@authorize.write("custom") id: number) { return { id } }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret, authPolicies }))
            .initialize()
        await supertest(app.callback())
            .post("/animal/save?id=1234")
            .set({ Authorization: `Bearer ${token}` })
            .expect(200, { id: 1234 })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to access current metadata on parameter property", async () => {
        const secret = "secret"
        const token = sign({ id: 123, role: "User" }, secret)
        const fn = jest.fn()
        const authPolicies = authPolicy().define("custom", ({ metadata }) => {
            fn(metadata.current)
            return true
        })
        @domain()
        class Animal {
            constructor(@authorize.write("custom") public name: string) { }
        }
        class AnimalController {
            @route.post()
            save(data: Animal) { return { data } }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret, authPolicies }))
            .initialize()
        await supertest(app.callback())
            .post("/animal/save")
            .send({ name: "bingo" })
            .set({ Authorization: `Bearer ${token}` })
            .expect(200, { data: { name: "bingo" } })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to access current metadata on projection authorizer", async () => {
        const secret = "secret"
        const token = sign({ id: 123, role: "User" }, secret)
        const fn = jest.fn()
        const authPolicies = authPolicy().define("custom", ({ metadata }) => {
            fn(metadata.current)
            return true
        })
        @domain()
        class Animal {
            constructor(@authorize.read("custom") public name: string) { }
        }
        class AnimalController {
            @route.get()
            @type(Animal)
            get() { return { name: "Bingo" } }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret, authPolicies }))
            .initialize()
        await supertest(app.callback())
            .get("/animal/get")
            .set({ Authorization: `Bearer ${token}` })
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to access current metadata on projection authorizer with property", async () => {
        const secret = "secret"
        const token = sign({ id: 123, role: "User" }, secret)
        const fn = jest.fn()
        const authPolicies = authPolicy().define("custom", ({ metadata }) => {
            fn(metadata.current)
            return true
        })
        class Animal {
            @authorize.read("custom")
            name: string
        }
        class AnimalController {
            @route.get()
            @type(Animal)
            get() { return { name: "Bingo" } }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret, authPolicies }))
            .initialize()
        await supertest(app.callback())
            .get("/animal/get")
            .set({ Authorization: `Bearer ${token}` })
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })
})