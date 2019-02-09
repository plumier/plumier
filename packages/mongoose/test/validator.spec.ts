import { collection, model, MongooseFacility } from "@plumjs/mongoose";
import { val, validateObject } from "@plumjs/validator";
import Mongoose from 'mongoose';
import { domain, PlumierApplication } from '@plumjs/core';
import Plumier from "@plumjs/plumier"
import { decorate } from 'tinspector';

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
        await facility.setup(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const UserModel = model(User)
        await UserModel.remove({})
        await new UserModel({ name: "Ketut", email: "ketut@gmail.com" }).save()
        const result = await validateObject(new User("Ketut", "ketut@gmail.com"), [], [], {} as any)
        expect(result).toEqual([{ messages: ['ketut@gmail.com already exists'], path: ['email'] }])
        Mongoose.disconnect()
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
        const facility = new MongooseFacility({
            model: [User],
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.setup(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const UserModel = model(User)
        await UserModel.remove({})
        await new UserModel({ name: "Ketut", email: "ketut@gmail.com" }).save()
        const result = await validateObject(new User("Ketut", "ketut@gmail.com"), [], [], {} as any)
        expect(result).toEqual([{ messages: ['ketut@gmail.com already exists'], path: ['email'] }])
        Mongoose.disconnect()
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
        const facility = new MongooseFacility({
            model: [User],
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.setup(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const UserModel = model(User)
        await UserModel.remove({})
        await new UserModel({ name: "Ketut", email: "ketut@gmail.com" }).save()
        const result = await validateObject(new User("Ketut", "KETUT@gmail.com"), [], [], {} as any)
        expect(result).toEqual([{ messages: ['KETUT@gmail.com already exists'], path: ['email'] }])
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
        await facility.setup(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const UserModel = model(User)
        await UserModel.remove({})
        const result = await validateObject(new User("Ketut", "ketut@gmail.com"), [], [], {} as any)
        expect(result).toEqual([])
        Mongoose.disconnect()
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
        const facility = new MongooseFacility({
            model: [User],
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.setup(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const UserModel = model(User)
        await UserModel.remove({})
        await new UserModel({ name: "Ketut", email: "ketut@gmail.com" }).save()
        const result = await validateObject(new User("Ketut", "m.ketut@gmail.com"), [], [], {} as any)
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
        await facility.setup(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const UserModel = model(User)
        await UserModel.remove({})
        const result = await validateObject(new User("Ketut", undefined), [], [], {} as any)
        expect(result).toEqual([])
        Mongoose.disconnect()
    })


})