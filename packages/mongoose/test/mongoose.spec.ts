import { Constructor, model, MongooseFacility, collection } from "@plumjs/mongoose";
import Mongoose from "mongoose";

import { DomainWithArrayOfDomain, DomainWithArrays, DomainWithDomain, DomainWithPrimitives } from "./model/my-domain";
import { consoleLog } from '@plumjs/core';
import { join } from 'path';

type Model<T> = Mongoose.Model<T & Mongoose.Document>


async function save<T extends object>(cls: Constructor<T>, value: T) {
    const Model = model(cls)
    await Model.remove({})
    const result = await new Model(value).save()
    return { model: Model, result }
}

describe("Mongoose Reference Domain Directly", () => {
    beforeAll(async () => {
        const facility = new MongooseFacility({
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.setup({ config: { mode: "production" } } as any)
    })

    afterAll(async () => await Mongoose.disconnect())


    it("Should generate domain with primitive type", async () => {
        const value = new DomainWithPrimitives("Mimi", false, 5, new Date("2018-1-1"))
        const { model, result } = await save(DomainWithPrimitives, value)
        const savedValue = await model.findById(result._id)
        expect(savedValue!.toObject()).toMatchObject(value)
        await model.remove({})
    })

    it("Should generate domain with array type", async () => {
        const value = new DomainWithArrays("Mimi", ["Pup", "Pip", "Meng"])
        const { model, result } = await save(DomainWithArrays, value)
        const savedValue = await model.findById(result._id)
        expect(savedValue!.toObject()).toMatchObject(value)
        await model.remove({})
    })

    it("Should generate domain with domain", async () => {
        const child = await save(DomainWithPrimitives, new DomainWithPrimitives("Mimi", false, 5, new Date("2018-1-1")))
        const parent = await save(DomainWithDomain, new DomainWithDomain(child.result._id))
        const saved = await parent.model.findById(parent.result._id).populate("child")
        expect(saved!.toObject()).toMatchObject(new DomainWithDomain(new DomainWithPrimitives("Mimi", false, 5, new Date("2018-1-1"))))
        await child.model.remove({})
        await parent.model.remove({})
    })

    it("Should generate domain with array of domain", async () => {
        const childValue = new DomainWithPrimitives("Mimi", false, 5, new Date("2018-1-1"))
        const child = await save(DomainWithPrimitives, childValue)
        const parent = await save(DomainWithArrayOfDomain, new DomainWithArrayOfDomain([child.result._id]))
        const saved = await parent.model.findById(parent.result._id).populate("children")
        expect(saved!.toObject()).toMatchObject(new DomainWithArrayOfDomain([childValue]))
        await child.model.remove({})
        await parent.model.remove({})
    })
})

describe("Model Load", () => {
    afterEach(async () => Mongoose.disconnect())

    it("Should be able to provide absolute path", async () => {
        const facility = new MongooseFacility({
            model: join(__dirname, "./model/my-domain"),
            uri: "mongodb://localhost:27017/test-data"
        })
        consoleLog.startMock()
        await facility.setup({ config: { mode: "debug" } } as any)
        expect((console.log as jest.Mock).mock.calls[2][0]).toContain("DomainWithPrimitives")
        expect((console.log as jest.Mock).mock.calls[3][0]).toContain("DomainWithArrays")
        expect((console.log as jest.Mock).mock.calls[4][0]).toContain("DomainWithDomain")
        expect((console.log as jest.Mock).mock.calls[5][0]).toContain("DomainWithArrayOfDomain")
        consoleLog.clearMock()
    })

    it("Should be able to provide absolute path", async () => {
        @collection()
        class DomainA {
            constructor(
                public name: string,
            ) { }
        }
        @collection()
        class DomainB {
            constructor(
                public name: string,
            ) { }
        }
        const facility = new MongooseFacility({
            model: [DomainA, DomainB],
            uri: "mongodb://localhost:27017/test-data"
        })
        consoleLog.startMock()
        await facility.setup({ config: { mode: "debug" } } as any)
        expect((console.log as jest.Mock).mock.calls[2][0]).toContain("DomainA")
        expect((console.log as jest.Mock).mock.calls[3][0]).toContain("DomainB")
        consoleLog.clearMock()
    })

    it("Should be able to use name alias", async () => {
        @collection("MyOtherDomain")
        class DomainA {
            constructor(
                public name: string,
            ) { }
        }
        const facility = new MongooseFacility({
            model: DomainA,
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.setup({ config: { mode: "production" } } as any)
        const mdl = model(DomainA)
        expect(new mdl({})).toBeInstanceOf(Mongoose.Model)
        expect(Mongoose.connection.models["MyOtherDomain"]).not.toBeUndefined()
        expect(Mongoose.connection.models["DomainA"]).toBeUndefined()
    })

    it("Should be able to use name alias on relation", async () => {
        delete Mongoose.connection.models["Child"]
        delete Mongoose.connection.models["Parent"]
        @collection("Child")
        class DomainB {
            constructor(public name: string) { }
        }

        @collection("Parent")
        class DomainA {
            constructor(
                public name: string,
                public child?: DomainB
            ) { }
        }

        const facility = new MongooseFacility({
            model: [DomainA, DomainB],
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.setup({ config: { mode: "production" } } as any)
        const Parent = model(DomainA)
        const Child = model(DomainB)
        await Parent.remove({})
        await Child.remove({})
        const child = new DomainB("Kima")
        const savedChild = await new Child(child).save()
        const data = new DomainA("Ketut", savedChild)
        const newParent = await new Parent(data).save()
        const savedParent = await Parent.findById(newParent._id).populate("child")
        expect(savedParent!.name).toBe("Ketut")
        expect(savedParent!.child!.name).toBe("Kima")
    })

    it("Should able to populate child without creating child model", async () => {
        delete Mongoose.connection.models["Child"]
        delete Mongoose.connection.models["Parent"]

        @collection("Child")
        class DomainB {
            constructor(public name: string) { }
        }

        @collection("Parent")
        class DomainA {
            constructor(
                public name: string,
                public child?: DomainB
            ) { }
        }

        const facility = new MongooseFacility({
            model: [DomainA, DomainB],
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.setup({ config: { mode: "production" } } as any)

        //setup db
        const childId = new Mongoose.Types.ObjectId()
        const parentId = new Mongoose.Types.ObjectId()
        await Mongoose.connection.collection("children").insert({__v: 0, _id: childId, name: "Kima" })
        await Mongoose.connection.collection("parents").insert({__v: 0, _id: parentId, name: "Ketut", child: childId })

        const Parent = model(DomainA)
        const savedParent = await Parent.findById(parentId.toHexString()).populate("child")
        expect(savedParent!.name).toBe("Ketut")
        expect(savedParent!.child!.name).toBe("Kima")
    })
})

describe("Proxy", () => {
    it("Should ok if toString() method is called", async () => {
        @collection()
        class OtherDomain {
            constructor(
                public name: string,
                public children: string[]
            ) { }
        }
        const Model = model(OtherDomain)
        expect(Model.toString()).toBe("[Function]")
        expect(() => Model.remove({})).toThrow("this.Query is not a constructor")
    })
})


describe("Analysis", () => {
    afterEach(async () => await Mongoose.disconnect())
    it("Should analyze missing @array decorator", async () => {
        @collection()
        class DomainWithArrays {
            constructor(
                public name: string,
                public children: string[]
            ) { }
        }
        const facility = new MongooseFacility({
            model: DomainWithArrays,
            uri: "mongodb://localhost:27017/test-data"
        })
        consoleLog.startMock()
        await facility.setup({ config: { mode: "debug" } } as any)
        expect((console.log as jest.Mock).mock.calls[2][0]).toBe("1. DomainWithArrays -> DomainWithArrays")
        expect((console.log as jest.Mock).mock.calls[3][0]).toContain("MONG1000")
        consoleLog.clearMock()
    })

    it("Should show error if no class decorated with @collection() found", async () => {
        class DomainWithArrays {
            constructor(
                public name: string,
                public children: string[]
            ) { }
        }
        const facility = new MongooseFacility({
            model: DomainWithArrays,
            uri: "mongodb://localhost:27017/test-data"
        })
        consoleLog.startMock()
        await facility.setup({ config: { mode: "debug" } } as any)
        expect((console.log as jest.Mock).mock.calls[2][0]).toContain("MONG1001")
        consoleLog.clearMock()
    })

})
