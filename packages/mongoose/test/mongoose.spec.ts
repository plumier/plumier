import { domain, Application } from "@plumjs/core";
import { MongooseFacility, model, Constructor, SchemaRegistry } from '@plumjs/mongoose';
import Mongoose from "mongoose"
import { array, reflect } from '@plumjs/reflect';
import { MyDomain, MyParentDomain } from './model/my-domain';
import { join } from 'path';
import { CustomLocationDomain, ParentCustomLocationDomain } from './custom-location/my-domain';

type Model<T> = Mongoose.Model<T & Mongoose.Document>

@domain()
class DomainWithPrimitives {
    constructor(
        public name: string,
        public deceased: boolean,
        public age: number,
        public registerDate: Date
    ) { }
}

@domain()
class DomainWithArrays {
    constructor(
        public name: string,
        public children: string[]
    ) { }
}

@domain()
class DomainWithDomain {
    constructor(
        public child: DomainWithPrimitives
    ) { }
}

@domain()
class DomainWithArrayOfDomain {
    constructor(
        @array(DomainWithPrimitives)
        public children: DomainWithPrimitives[]
    ) { }
}

async function save<T extends object>(cls: Constructor<T>, value: T) {
    const Model = model(cls)
    await Model.remove({})
    const result = await new Model(value).save()
    return { model: Model, result }
}

describe("Mongoose Reference Domain Directly", () => {
    beforeAll(async () => {
        const facility = new MongooseFacility({
            domainModel: [
                DomainWithPrimitives,
                DomainWithArrays,
                DomainWithDomain,
                DomainWithArrayOfDomain
            ],
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.setup({} as Application)
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

describe("Mongoose Reference Default Folder", () => {
    it("Should load default location domain", async () => {
        const facility = new MongooseFacility({ domainModel: join(__dirname, "./model"), uri: "mongodb://localhost:27017/test-data" })
        await facility.setup({} as Application)
        const child = await save(MyDomain, new MyDomain("Mimi"))
        const parent = await save(MyParentDomain, new MyParentDomain(child.result._id))
        const savedParent = await parent.model.findById(parent.result._id).populate("child")
        expect(savedParent).toMatchObject(new MyParentDomain(new MyDomain("Mimi")))
        await child.model.remove({})
        await parent.model.remove({})
        await Mongoose.disconnect()
    })

    it("Should load default location domain", async () => {
        const facility = new MongooseFacility({ domainModel: "./custom-location/my-domain", uri: "mongodb://localhost:27017/test-data" })
        await facility.setup({} as Application)
        const child = await save(CustomLocationDomain, new CustomLocationDomain("Mimi"))
        const parent = await save(ParentCustomLocationDomain, new ParentCustomLocationDomain(child.result._id))
        const savedParent = await parent.model.findById(parent.result._id).populate("child")
        expect(savedParent).toMatchObject(new ParentCustomLocationDomain(new CustomLocationDomain("Mimi")))
        await child.model.remove({})
        await parent.model.remove({})
        await Mongoose.disconnect()
    })

    it("Should load single domain", async () => {
        @domain()
        class MySingleDomain {
            constructor(
                public name: string
            ) { }
        }
        const facility = new MongooseFacility({
            domainModel: MySingleDomain,
            uri: "mongodb://localhost:27017/test-data"
        })
        await facility.setup({} as Application)
        const Model = model(MySingleDomain)
        expect(Model).not.toBeNull()
        await Mongoose.disconnect()
    })
})

describe("Error Handling", () => {
    it("Should report non domain class", async () => {
        class MySingleDomain {
            constructor(
                public name: string
            ) { }
        }
        expect(() => new MongooseFacility({
            domainModel: MySingleDomain,
            uri: "mongodb://localhost:27017/test-data"
        })).toThrow("PLUM1007")
        
    })

    it("Should report if path doesn't contains domain", async () => {
        expect(() => new MongooseFacility({
            domainModel: "./no-domain",
            uri: "mongodb://localhost:27017/test-data"
        })).toThrow("PLUM1007")
    })
})