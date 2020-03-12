import { authorize, CustomAuthorizerFunction, route, domain } from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import { sign } from "jsonwebtoken"
import supertest from "supertest"

import { fixture } from "../helper"


describe("Custom Authorizer", () => {
    it("Should able to access metadata from custom authorizer", async () => {
        const secret = "secret"
        const token = sign({ id: 123, role: "User" }, secret)
        const fn = jest.fn()
        const customAuthorizer: CustomAuthorizerFunction = ({ metadata }) => {
            fn(metadata)
            return true
        }
        class AnimalController {
            @route.get()
            @authorize.custom(customAuthorizer)
            get(id: number) { return { id } }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret }))
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
        const customAuthorizer: CustomAuthorizerFunction = ({ metadata }) => {
            fn(metadata.actionParams)
            return true
        }
        @authorize.custom(customAuthorizer)
        class AnimalController {
            @route.get()
            get(id: number) { return { id } }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret }))
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
        const customAuthorizer: CustomAuthorizerFunction = ({ metadata }) => {
            fn(metadata.current)
            return true
        }
        @authorize.custom(customAuthorizer)
        class AnimalController {
            @route.get()
            get(id: number) { return { id } }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret }))
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
        const customAuthorizer: CustomAuthorizerFunction = ({ metadata }) => {
            fn(metadata.current)
            return true
        }
        class AnimalController {
            @route.get()
            @authorize.custom(customAuthorizer)
            get(id: number) { return { id } }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret }))
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
        const customAuthorizer: CustomAuthorizerFunction = ({ metadata }) => {
            fn(metadata.current)
            return true
        }
        class AnimalController {
            @route.get()
            get(@authorize.custom(customAuthorizer) id: number) { return { id } }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret }))
            .initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234")
            .set({ Authorization: `Bearer ${token}` })
            .expect(200, { id: 1234 })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to access current metadata on parameter property", async () => {
        const secret = "secret"
        const token = sign({ id: 123, role: "User" }, secret)
        const fn = jest.fn()
        const customAuthorizer: CustomAuthorizerFunction = ({ metadata }) => {
            fn(metadata.current)
            return true
        }
        @domain()
        class Animal {
            constructor(@authorize.custom(customAuthorizer) public name: string) { }
        }
        class AnimalController {
            @route.post()
            save(data: Animal) { return { data } }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret }))
            .initialize()
        await supertest(app.callback())
            .post("/animal/save")
            .send({ name: "bingo" })
            .set({ Authorization: `Bearer ${token}` })
            .expect(200, { data: { name: "bingo" } })
        expect(fn.mock.calls).toMatchSnapshot()
    })
})