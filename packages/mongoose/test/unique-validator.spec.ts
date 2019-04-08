import { collection, model, MongooseFacility } from "@plumier/mongoose";
import { val, validatorVisitor } from "@plumier/core";
import Mongoose from 'mongoose';
import { domain, PlumierApplication } from '@plumier/core';
import Plumier from "plumier"
import { decorate } from 'tinspector';
import createConverter, { ConversionError } from "typedconverter"

const convert = createConverter({ visitors: [validatorVisitor] })

async function validateObject(val: any, type:Function) {
    try{
        await convert(val, type)
        return []
    } catch(e){
        return e.issues
    }
}

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

        await facility.initialize(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const UserModel = model(User)
        await UserModel.deleteMany({})
        await new UserModel({ name: "Ketut", email: "ketut@gmail.com" }).save()
        const result = await validateObject({ name: "Ketut", email: "ketut@gmail.com" }, User)
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
        await facility.initialize(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const UserModel = model(User)
        await UserModel.deleteMany({})
        await new UserModel({ name: "Ketut", email: "ketut@gmail.com" }).save()
        const result = await validateObject({ name: "Ketut", email: "ketut@gmail.com" }, User)
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
        await facility.initialize(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const UserModel = model(User)
        await UserModel.deleteMany({})
        await new UserModel({ name: "Ketut", email: "ketut@gmail.com" }).save()
        const result = await validateObject({ name: "Ketut", email: "KETUT@gmail.com" }, User)
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
        await facility.initialize(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const UserModel = model(User)
        await UserModel.deleteMany({})
        const result = await validateObject({ name: "Ketut", email: "ketut@gmail.com" }, User)
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
        await facility.initialize(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const UserModel = model(User)
        await UserModel.deleteMany({})
        await new UserModel({ name: "Ketut", email: "ketut@gmail.com" }).save()
        const result = await validateObject({ name: "Ketut", email: "m.ketut@gmail.com" }, User)
        expect(result).toEqual([])
        Mongoose.disconnect()
    })

    it("Should return valid if data is optional and provided undefined", async () => {
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
        await facility.initialize(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const UserModel = model(User)
        await UserModel.deleteMany({})
        const result = await validateObject({ name: "Ketut", email: undefined }, User)
        expect(result).toEqual([])
        Mongoose.disconnect()
    })
})