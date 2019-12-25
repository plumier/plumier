import { collection } from "@plumier/mongoose"
import mongoose from "mongoose"
import Plumier, { authorize, route, val, WebApiFacility, CustomValidatorFunction as Val } from "plumier"
import supertest = require("supertest")

@collection()
export class User {
    constructor(
        @val.required()
        public name: string,
        @val.required()
        public password: string,
        public dateOfBirth: Date,
        public active: boolean
    ) { }
}

const validatePassword: Val = (value, meta) => {
    if (value.password !== value.confirmPassword)
        return val.result("confirmPassword", "Password doesn't match")
}

export class UsersController {
    @authorize.public()
    @route.post("")
    save(@val.custom(validatePassword) data: User) {
        return data
    }
}

const app = new Plumier()
    .set(new WebApiFacility({ controller: __filename }))
    .set({ mode: "production" })

afterAll(async () => await mongoose.disconnect())

it("Should run correctly", async () => {
    const koa = await app.initialize()
    await supertest(koa.callback())
        .post("/users")
        .send({ name: "Lorem", password: "abcd", confirmPassword: "abcd" })
        .expect(200)
})

it("Should return 422 when try to set role", async () => {
    const koa = await app.initialize()
    const { body } = await supertest(koa.callback())
        .post("/users")
        .send({ name: "Lorem", password: "abcd", confirmPassword: "123" })
        .expect(422)
    expect(body).toMatchSnapshot()
})