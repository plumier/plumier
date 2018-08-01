import { collection, model, MongooseFacility } from "@plumjs/mongoose";
import { val, validateObject } from "@plumjs/validator";
import Mongoose from 'mongoose';
import { domain } from '@plumjs/core';

describe("unique validator", () => {
    it("Should return invalid if data already exist", async () => {
        @collection()
        class User {
            constructor(
                public name: string,
                @val.unique()
                public email: string
            ) { }
        }
        const facility = new MongooseFacility({
            model: [User],
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.setup({ config: { mode: "production" } } as any)
        const UserModel = model(User)
        await UserModel.remove({})
        await new UserModel({ name: "Ketut", email: "ketut@gmail.com" }).save()
        const result = await validateObject(new User("Ketut", "ketut@gmail.com"))
        expect(result).toEqual([{ messages: ['ketut@gmail.com already exists'], path: ['email'] }])
        Mongoose.disconnect()
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
        const facility = new MongooseFacility({
            model: [User],
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.setup({ config: { mode: "production" } } as any)
        const UserModel = model(User)
        await UserModel.remove({})
        const result = await validateObject(new User("Ketut", "ketut@gmail.com"))
        expect(result).toEqual([])
        Mongoose.disconnect()
    })

    it("Should return valid if data is undefined", async () => {
        @collection()
        class User {
            constructor(
                public name: string,
                @val.optional()
                @val.unique()
                public email: string | undefined
            ) { }
        }
        const facility = new MongooseFacility({
            model: [User],
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.setup({ config: { mode: "production" } } as any)
        const UserModel = model(User)
        await UserModel.remove({})
        const result = await validateObject(new User("Ketut", undefined))
        expect(result).toEqual([])
        Mongoose.disconnect()
    })


    it("Should throw error when used on class that is not mapped to collection", async () => {
        @domain()
        class User {
            constructor(
                public name: string,
                @val.unique()
                public email: string
            ) { }
        }
        expect(validateObject(new User("Ketut", "ketut@gmail.com")))
            .rejects.toEqual(new Error("MONG1002: @val.unique()  only can be applied to a class that mapped to mongodb collection, in class User.email"))
    })
})