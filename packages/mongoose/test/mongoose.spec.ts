import { Constructor, model, MongooseFacility, collection } from "@plumjs/mongoose";
import Mongoose from "mongoose";

import { DomainWithArrayOfDomain, DomainWithArrays, DomainWithDomain, DomainWithPrimitives, NonDecoratedDomain } from "./model/my-domain";
import { consoleLog, PlumierApplication, Class, route } from '@plumjs/core';
import { join } from 'path';
import Plumier, { WebApiFacility, array } from "@plumjs/plumier"
import supertest from "supertest"

type Model<T> = Mongoose.Model<T & Mongoose.Document>


async function save<T extends object>(cls: Constructor<T>, value: T) {
    const Model = model(cls)
    await Model.remove({})
    const result = await new Model(value).save()
    return { model: Model, result }
}

describe("Mongoose Reference Domain Directly", () => {
    beforeAll(async () => {
        const app = new Plumier().set({ mode: "production" })
        const facility = new MongooseFacility({
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.setup(<PlumierApplication>app)
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
        await facility.setup(<PlumierApplication>new Plumier())
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
        await facility.setup(<PlumierApplication>new Plumier())
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
        await facility.setup(<PlumierApplication>new Plumier().set({ mode: "production" }))
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
        await facility.setup(<PlumierApplication>new Plumier().set({ mode: "production" }))
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
        await facility.setup(<PlumierApplication>new Plumier().set({ mode: "production" }))

        //setup db
        const childId = new Mongoose.Types.ObjectId()
        const parentId = new Mongoose.Types.ObjectId()
        await Mongoose.connection.collection("children").insert({ __v: 0, _id: childId, name: "Kima" })
        await Mongoose.connection.collection("parents").insert({ __v: 0, _id: parentId, name: "Ketut", child: childId })

        const Parent = model(DomainA)
        const savedParent = await Parent.findById(parentId.toHexString()).populate("child")
        expect(savedParent!.name).toBe("Ketut")
        expect(savedParent!.child!.name).toBe("Kima")
    })
})

describe("Error Handling", () => {
    afterEach(async () => await Mongoose.disconnect())
    it("Should show friendly error for model that doesn't decorated with collection", async () => {
        const facility = new MongooseFacility({
            model: join(__dirname, "./model/my-domain"),
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.setup(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const Model = model(NonDecoratedDomain)
        try {
            await new Model({ name: "hello" }).save()
        }
        catch (e) {
            expect(e.message).toBe("MONG1003: NonDecoratedDomain not decorated with @collection()")
        }
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
        await facility.setup(<PlumierApplication>new Plumier())
        expect((console.log as jest.Mock).mock.calls[2][0]).toContain("1. DomainWithArrays -> DomainWithArrays")
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
        await facility.setup(<PlumierApplication>new Plumier())
        expect((console.log as jest.Mock).mock.calls[2][0]).toContain("MONG1001")
        consoleLog.clearMock()
    })

})

describe("Post Relational Data", () => {
    function fixture(controller: Class, model: Class[]) {
        const app = new Plumier()
        app.set(new WebApiFacility({ controller }))
        app.set(new MongooseFacility({
            model, uri: "mongodb://localhost:27017/test-data"
        }))
        app.set({ mode: "production" })
        return app.initialize()
    }

    afterEach(async () => await Mongoose.disconnect())

    it("Should able to send MongoDbId for relational model", async () => {
        @collection()
        class Image {
            constructor(
                public name: string
            ) { }
        }
        @collection()
        class Animal {
            constructor(
                public name: string,
                @array(Image)
                public images: Image[]
            ) { }
        }
        const ImageModel = model(Image)
        const AnimalModel = model(Animal)
        class AnimalController {
            @route.post()
            async save(data: Animal) {
                const newly = await new AnimalModel(data).save()
                return newly._id
            }
        }
        const koa = await fixture(AnimalController, [Image, Animal])
        const [image1, image2] = await Promise.all([
            await new ImageModel({ name: "Image1.jpg" }).save(),
            await new ImageModel({ name: "Image2.jpg" }).save()
        ]);
        const response = await supertest(koa.callback())
            .post("/animal/save")
            .send({ name: "Mimi", images: [image1._id, image2._id] })
            .expect(200)
        const result = await AnimalModel.findById(response.body)
            .populate("images")
        expect(result!.images[0].name).toBe("Image1.jpg")
        expect(result!.images[1].name).toBe("Image2.jpg")
    })
})
