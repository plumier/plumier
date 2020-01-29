import { JwtAuthFacility } from "@plumier/jwt"
import { collection, model, MongooseFacility } from "@plumier/mongoose"
import mongoose from "mongoose"
import Plumier, { authorize, route, WebApiFacility } from "plumier"
import supertest = require("supertest")

@collection()
export class User {
    constructor(
        public name: string,
        public password: string,
        public dateOfBirth: Date,
        @authorize.role("Admin")
        public role: "Admin" | "User",
        public active: boolean
    ) { }
}

export const UserModel = model(User)

export class UsersController {
    @authorize.public()
    @route.post("")
    save(data: User) {
        return new UserModel({ ...data, role: "User", active: true }).save()
    }
}

const app = new Plumier()
    .set(new WebApiFacility({ controller: __filename }))
    .set(new MongooseFacility({ uri: "mongodb://localhost:27017/test-data", model: __filename }))
    .set(new JwtAuthFacility({ secret: "secret" }))
    .set({ mode: "production" })

afterAll(async () => await mongoose.disconnect())

it("Should run correctly", async () => {
    const koa = await app.initialize()
    await supertest(koa.callback())
        .post("/users")
        .send({ name: "Lorem" })
        .expect(200)
})

it("Should return 422 when try to set role", async () => {
    const koa = await app.initialize()
    await supertest(koa.callback())
        .post("/users")
        .send({ name: "Lorem", role: "Admin" })
        .expect(401)
})