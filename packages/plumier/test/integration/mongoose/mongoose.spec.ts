import { consoleLog } from "@plumier/core"
import { collection, Constructor, model, MongooseFacility } from "@plumier/mongoose"
import { existsSync, unlinkSync } from "fs"
import Mongoose from "mongoose"
import { join } from "path"
import Plumier, { Class, PlumierApplication, route, val, WebApiFacility } from "plumier"
import supertest from "supertest"
import reflect from "tinspector"

import { DomainWithArrayOfDomain, DomainWithDomain, DomainWithPrimitives, NonDecoratedDomain, DomainWithArrays } from "./model/my-domain"

type Model<T> = Mongoose.Model<T & Mongoose.Document>

function clearCache() {
    Object.keys(Mongoose.connection.models)
        .forEach(name => delete Mongoose.connection.models[name])
}

async function save<T extends object>(cls: Constructor<T>, value: T) {
    const Model = model(cls)
    await Model.deleteMany({})
    const result = await new Model(value).save()
    return { model: Model, result }
}

describe("Mongoose Reference Domain Directly", () => {
    beforeAll(async () => {
        clearCache()
        const app = new Plumier().set({ mode: "production" })
        const facility = new MongooseFacility({
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.initialize(<PlumierApplication>app)
    })

    afterAll(async () => await Mongoose.disconnect())


    it("Should generate domain with primitive type", async () => {
        const value = new DomainWithPrimitives("Mimi", false, 5, new Date("2018-1-1"))
        const { model, result } = await save(DomainWithPrimitives, value)
        const savedValue = await model.findById(result._id)
        expect(savedValue!.toObject()).toMatchObject(value)
        await model.deleteMany({})
    })

    it("Should generate domain with array type", async () => {
        const value = new DomainWithArrays("Mimi", ["Pup", "Pip", "Meng"])
        const { model, result } = await save(DomainWithArrays, value)
        const savedValue = await model.findById(result._id)
        expect(savedValue!.toObject()).toMatchObject(value)
        await model.deleteMany({})
    })

    it("Should generate domain with domain", async () => {
        const child = await save(DomainWithPrimitives, new DomainWithPrimitives("Mimi", false, 5, new Date("2018-1-1")))
        const parent = await save(DomainWithDomain, new DomainWithDomain(child.result._id))
        const saved = await parent.model.findById(parent.result._id).populate("child")
        expect(saved!.toObject()).toMatchObject(new DomainWithDomain(new DomainWithPrimitives("Mimi", false, 5, new Date("2018-1-1"))))
        await child.model.deleteMany({})
        await parent.model.deleteMany({})
    })

    it("Should generate domain with array of domain", async () => {
        const childValue = new DomainWithPrimitives("Mimi", false, 5, new Date("2018-1-1"))
        const child = await save(DomainWithPrimitives, childValue)
        const parent = await save(DomainWithArrayOfDomain, new DomainWithArrayOfDomain([child.result._id]))
        const saved = await parent.model.findById(parent.result._id).populate("children")
        expect(saved!.toObject()).toMatchObject(new DomainWithArrayOfDomain([childValue]))
        await child.model.deleteMany({})
        await parent.model.deleteMany({})
    })
})

describe("Model Load", () => {
    beforeEach(() => clearCache())
    afterEach(async () => Mongoose.disconnect())


    it("Should be able to fill with absolute path", async () => {
        const facility = new MongooseFacility({
            model: join(__dirname, "./model/my-domain"),
            uri: "mongodb://localhost:27017/test-data"
        })
        consoleLog.startMock()
        await facility.initialize(<PlumierApplication>new Plumier())
        expect((console.log as jest.Mock).mock.calls[2][0]).toContain("DomainWithPrimitives")
        expect((console.log as jest.Mock).mock.calls[3][0]).toContain("DomainWithArrays")
        expect((console.log as jest.Mock).mock.calls[4][0]).toContain("DomainWithDomain")
        expect((console.log as jest.Mock).mock.calls[5][0]).toContain("DomainWithArrayOfDomain")
        consoleLog.clearMock()
    })

    it("Should be able to fill with file name .js", async () => {
        const facility = new MongooseFacility({
            model: join(__dirname, "./model/jsonly-domain"),
            uri: "mongodb://localhost:27017/test-data"
        })
        consoleLog.startMock()
        await facility.initialize(<PlumierApplication>new Plumier())
        expect((console.log as jest.Mock).mock.calls[2][0]).toContain("DomainWithPrimitives")
        consoleLog.clearMock()
    })

    it("Should be able to fill with file name .ts", async () => {
        const jsFile = join(__dirname, "./model/tsonly-domain.js")
        if (existsSync(jsFile))
            unlinkSync(jsFile)
        const facility = new MongooseFacility({
            model: join(__dirname, "./model/tsonly-domain"),
            uri: "mongodb://localhost:27017/test-data"
        })
        consoleLog.startMock()
        await facility.initialize(<PlumierApplication>new Plumier())
        expect((console.log as jest.Mock).mock.calls[2][0]).toContain("DomainWithPrimitives")
        consoleLog.clearMock()
    })

    it("Should be able to fill with domain", async () => {
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
        await facility.initialize(<PlumierApplication>new Plumier())
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
        await facility.initialize(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const mdl = model(DomainA)
        expect(new mdl({})).toBeInstanceOf(Mongoose.Model)
        expect(Mongoose.connection.models["MyOtherDomain"]).not.toBeUndefined()
        expect(Mongoose.connection.models["DomainA"]).toBeUndefined()
    })

    it("Should be able to use name alias on relation", async () => {
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
        await facility.initialize(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const Parent = model(DomainA)
        const Child = model(DomainB)
        await Parent.deleteMany({})
        await Child.deleteMany({})
        const child = new DomainB("Kima")
        const savedChild = await new Child(child).save()
        const data = new DomainA("Ketut", savedChild)
        const newParent = await new Parent(data).save()
        const savedParent = await Parent.findById(newParent._id).populate("child")
        expect(savedParent!.name).toBe("Ketut")
        expect(savedParent!.child!.name).toBe("Kima")
    })

    it("Model proxy should load children schema", async () => {

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
        await facility.initialize(<PlumierApplication>new Plumier().set({ mode: "production" }))

        //setup db
        const childId = new Mongoose.Types.ObjectId()
        const parentId = new Mongoose.Types.ObjectId()
        await Mongoose.connection.collection("children").insertOne({ __v: 0, _id: childId, name: "Kima" })
        await Mongoose.connection.collection("parents").insertOne({ __v: 0, _id: parentId, name: "Ketut", child: childId })

        const Parent = model(DomainA)
        const savedParent = await Parent.findById(parentId.toHexString()).populate("child")
        expect(savedParent!.name).toBe("Ketut")
        expect(savedParent!.child!.name).toBe("Kima")
    })

    it("Model proxy should load nested children schema", async () => {

        @collection()
        class Tag {
            constructor(public name: string) { }
        }

        @collection()
        class Animal {
            constructor(public name: string, public tag: Tag) { }
        }

        @collection()
        class Human {
            constructor(public name: string, public pet: Animal) { }
        }

        const facility = new MongooseFacility({
            model: [Human, Animal, Tag],
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.initialize(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const humanId = new Mongoose.Types.ObjectId()
        const animalId = new Mongoose.Types.ObjectId()
        const tagId = new Mongoose.Types.ObjectId()
        await Mongoose.connection.collection("tags").insertOne({ __v: 0, _id: tagId, name: "The Tag" })
        await Mongoose.connection.collection("animals").insertOne({ __v: 0, _id: animalId, name: "Mimi", tag: tagId })
        await Mongoose.connection.collection("humen").insertOne({ __v: 0, _id: humanId, name: "Ketut", pet: animalId })

        const HumanModel = model(Human)
        const result = await HumanModel.findById(humanId.toHexString())
            .populate({
                path: "pet",
                populate: {
                    path: "tag"
                }
            })
        expect(result!.name).toBe("Ketut")
        expect(result!.pet.name).toBe("Mimi")
        expect(result!.pet.tag.name).toBe("The Tag")
    })

    it("Model proxy should not register dup properties twice", async () => {


        @collection()
        class Animal {
            constructor(public name: string) { }
        }

        @collection()
        class Human {
            constructor(public name: string, public pet: Animal, public secondPet: Animal) { }
        }

        const facility = new MongooseFacility({
            model: [Human, Animal],
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.initialize(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const humanId = new Mongoose.Types.ObjectId()
        const mimiId = new Mongoose.Types.ObjectId()
        const bubId = new Mongoose.Types.ObjectId()
        await Mongoose.connection.collection("animals").insertOne({ __v: 0, _id: mimiId, name: "Mimi" })
        await Mongoose.connection.collection("animals").insertOne({ __v: 0, _id: bubId, name: "Bub" })
        await Mongoose.connection.collection("humen").insertOne({ __v: 0, _id: humanId, name: "Ketut", pet: mimiId, secondPet: bubId })

        const HumanModel = model(Human)
        const result = await HumanModel.findById(humanId.toHexString())
            .populate([{ path: "pet" }, { path: "secondPet" }])
        expect(result!.name).toBe("Ketut")
        expect(result!.pet.name).toBe("Mimi")
        expect(result!.secondPet.name).toBe("Bub")
    })
})

describe("Custom Schema Generator", () => {
    beforeEach(() => clearCache())
    afterEach(async () => Mongoose.disconnect())

    it("Should provided correct parameters", async () => {
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
        const fn = jest.fn()
        const facility = new MongooseFacility({
            model: [DomainA, DomainB],
            uri: "mongodb://localhost:27017/test-data",
            schemaGenerator: (a, b) => {
                fn(a, b)
                return new Mongoose.Schema(a)
            }
        })
        await facility.initialize(<PlumierApplication>new Plumier().set({ mode: "production" }))
        expect(fn.mock.calls[0][0]).toMatchObject({ name: String })
        expect(fn.mock.calls[0][1]).toMatchObject({ name: 'DomainA' })
        expect(fn.mock.calls[1][0]).toMatchObject({ name: String })
        expect(fn.mock.calls[1][1]).toMatchObject({ name: 'DomainB' })
    })

    it("Should able to override schema", async () => {
        @collection()
        class DomainA {
            constructor(
                public name: string,
            ) { }
        }

        const Model = model(DomainA)
        const facility = new MongooseFacility({
            model: [DomainA],
            uri: "mongodb://localhost:27017/test-data",
            schemaGenerator: (a, b) => {
                return new Mongoose.Schema(a, { timestamps: true })
            }
        })
        await facility.initialize(<PlumierApplication>new Plumier().set({ mode: "production" }))
        const result = await new Model({ name: "Hello" }).save()
        const props = Object.keys(result.toObject())
        expect(props.some(x => x === "createdAt")).toBe(true)
        expect(props.some(x => x === "updatedAt")).toBe(true)
    })

})

describe("Error Handling", () => {
    beforeEach(() => clearCache())
    afterEach(async () => await Mongoose.disconnect())
    it("Should show friendly error for model that doesn't decorated with collection", async () => {
        const facility = new MongooseFacility({
            model: join(__dirname, "./model/my-domain"),
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.initialize(<PlumierApplication>new Plumier().set({ mode: "production" }))
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
    beforeEach(() => clearCache())
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
        expect(() => Model.deleteMany({})).toThrow()
    })
})


describe("Analysis", () => {
    beforeEach(() => clearCache())
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
        await facility.initialize(<PlumierApplication>new Plumier())
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
        await facility.initialize(<PlumierApplication>new Plumier())
        expect((console.log as jest.Mock).mock.calls[2][0]).toContain("MONG1001")
        consoleLog.clearMock()
    })

})

describe("Automatically replace mongodb id into ObjectId on populate data", () => {
    function fixture(controller: Class, model: Class[]) {
        const app = new Plumier()
        app.set(new WebApiFacility({ controller }))
        app.set(new MongooseFacility({
            model, uri: "mongodb://localhost:27017/test-data"
        }))
        app.set({ mode: "production" })
        return app.initialize()
    }

    beforeEach(() => clearCache())
    afterEach(async () => await Mongoose.disconnect())

    it("Should work properly on Array", async () => {
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
                @reflect.array(Image)
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

    it("Should work properly on nested object", async () => {
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
                public image: Image
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
        const image1 = await new ImageModel({ name: "Image1.jpg" }).save()

        const response = await supertest(koa.callback())
            .post("/animal/save")
            .send({ name: "Mimi", image: image1._id })
            .expect(200)
        const result = await AnimalModel.findById(response.body)
            .populate("image")
        expect(result!.image.name).toBe("Image1.jpg")
    })

    it("Should not convert non relational data", async () => {
        @collection()
        class Image {
            constructor(
                public name: string
            ) { }
        }
        const ImageModel = model(Image)
        const fn = jest.fn()
        class AnimalController {
            @route.get(":id")
            async get(id:string) {
                fn(typeof id)
            }
        }
        const koa = await fixture(AnimalController, [Image])
        
        await supertest(koa.callback())
            .get("/animal/" + Mongoose.Types.ObjectId())
            .expect(200)
        expect(fn.mock.calls[0][0]).toBe("string")
    })
})
