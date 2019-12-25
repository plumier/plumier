import { JwtAuthFacility } from "@plumier/jwt"
import { collection } from "@plumier/mongoose"
import mongoose from "mongoose"
import Plumier, { route, WebApiFacility, CustomBinderFunction as Bind, bind, authorize, domain, val } from "plumier"
import supertest = require("supertest")
import { sign } from 'jsonwebtoken'

@collection()
export class User {
    constructor(
        public name: string,
        public dateOfBirth: Date,
        public active: boolean
    ) { }
}
const bindUserId: Bind = ctx => ctx.path.match(/me/i) ? ctx.state.user.userId : ctx.query.id

export class UsersController {
    @route.get(":id")
    @route.get("me")
    get(@bind.custom(bindUserId) id: number) {
        return { id }
    }

    @route.put(":id")
    @route.get("me")
    modify(@bind.custom(bindUserId) id: number, data: User) {
        return { id }
    }

    @route.delete(":id")
    @route.get("me")
    delete(@bind.custom(bindUserId) id: number) {
        return { id }
    }
}

const app = new Plumier()
    .set(new WebApiFacility({ controller: __filename }))
    .set(new JwtAuthFacility({ secret: "secret" }))
    .set({ mode: "production" })

afterAll(async () => await mongoose.disconnect())
const token = sign({ userId: 123 }, "secret")

it("Should able to serve /users/:id", async () => {
    const koa = await app.initialize()
    await supertest(koa.callback())
        .get("/users/456789")
        .set("Authorization", `Bearer ${token}`)
        .expect(200, { id: 456789 })
    await supertest(koa.callback())
        .put("/users/456789")
        .send({})
        .set("Authorization", `Bearer ${token}`)
        .expect(200, { id: 456789 })
    await supertest(koa.callback())
        .delete("/users/456789")
        .set("Authorization", `Bearer ${token}`)
        .expect(200, { id: 456789 })
})

it("Should able to serve /users/me", async () => {
    const koa = await app.initialize()
    await supertest(koa.callback())
        .get("/users/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200, { id: 123 })
    await supertest(koa.callback())
        .put("/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(200, { id: 123 })
    await supertest(koa.callback())
        .delete("/users/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200, { id: 123 })
})