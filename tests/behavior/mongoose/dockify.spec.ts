import { collection, generator } from "@plumier/mongoose";
import mongoose from "mongoose"

const dbUri = "mongodb://localhost:27017/test-data"

describe("Dockify", () => {
    beforeAll(async () => await mongoose.connect(dbUri))
    afterAll(async () => await mongoose.disconnect())
    beforeEach(() => {
        mongoose.models = {}
        mongoose.connection.models = {}
    })

    it("Should not convert primitive types", async () => {
        const { model } = generator()
        @collection()
        class Dummy {
            constructor(
                public stringProp: string,
                public numberProp: number,
                public booleanProp: boolean,
                public dateProp: Date,
            ) { }
        }
        const DummyModel = model(Dummy)
        const result = await DummyModel.create(<Dummy>{
            stringProp: "string",
            numberProp: 123,
            booleanProp: true,
            dateProp: new Date(Date.UTC(2020, 2, 2))
        })
        expect(result).toMatchSnapshot()
    })

    it("Should convert nested type", async () => {
        const { model } = generator()

        @collection()
        class Child {
            constructor(
                public stringProp: string
            ) { }
        }
        @collection()
        class Dummy {
            constructor(
                public child: Child
            ) { }
        }
        const DummyModel = model(Dummy)
        const dummy = await DummyModel.create(<Dummy>{
            child: { stringProp: "string" }
        })
        const result = await DummyModel.findById(dummy._id)
        expect(result!.child.id).toBeUndefined()
        expect(result).toMatchSnapshot()
    })

    it("Should convert nested ref type", async () => {
        const { model } = generator()

        @collection({ toObject: { virtuals: true } })
        class Child {
            constructor(
                public stringProp: string
            ) { }
        }
        @collection()
        class Dummy {
            constructor(
                @collection.ref(Child)
                public child: Child
            ) { }
        }
        const ChildModel = model(Child)
        const DummyModel = model(Dummy)
        const child = await ChildModel.create(<Child>{ stringProp: "string" })
        const dummy = await DummyModel.create(<Dummy>{
            child: child._id
        })
        const result = await DummyModel.findById(dummy._id).populate("child")
        expect(result!.child.id).toBe(child._id.toString())
        expect(result).toMatchSnapshot()
    })

    it("Should convert nested nested ref type", async () => {
        const { model } = generator()

        @collection({ toObject: { virtuals: true } })
        class GrandChild {
            constructor(
                public stringProp: string
            ) { }
        }
        @collection({ toObject: { virtuals: true } })
        class Child {
            constructor(
                @collection.ref(GrandChild)
                public child: GrandChild
            ) { }
        }
        @collection()
        class Dummy {
            constructor(
                @collection.ref(Child)
                public child: Child
            ) { }
        }
        const GrandChildModel = model(GrandChild)
        const ChildModel = model(Child)
        const DummyModel = model(Dummy)
        const grandChild = await GrandChildModel.create(<GrandChild>{ stringProp: "string" })
        const child = await ChildModel.create(<Child>{ child: grandChild._id })
        const dummy = await DummyModel.create(<Dummy>{ child: child._id })
        const result = await DummyModel.findById(dummy._id).populate({
            path: "child",
            populate: {
                path: "child"
            }
        })
        expect(result!.child.id).toBe(child._id.toString())
        expect(result!.child.child.id).toBe(grandChild._id.toString())
        expect(result).toMatchSnapshot()
    })

    it("Should convert nested array ref type", async () => {
        const { model } = generator()

        @collection({ toObject: { virtuals: true } })
        class Child {
            constructor(
                public stringProp: string
            ) { }
        }
        @collection()
        class Dummy {
            constructor(
                @collection.ref([Child])
                public child: Child[]
            ) { }
        }
        const ChildModel = model(Child)
        const DummyModel = model(Dummy)
        const child = await ChildModel.create(<Child>{ stringProp: "string" })
        const dummy = await DummyModel.create(<Dummy>{
            child: [child._id]
        })
        const result = await DummyModel.findById(dummy._id).populate("child")
        expect(result!.child[0].id).toBe(child._id.toString())
        expect(result).toMatchSnapshot()
    })

    it("Should convert nested nested array ref type", async () => {
        const { model } = generator()

        @collection({ toObject: { virtuals: true } })
        class GrandChild {
            constructor(
                public stringProp: string
            ) { }
        }
        @collection({ toObject: { virtuals: true } })
        class Child {
            constructor(
                @collection.ref([GrandChild])
                public child: GrandChild[]
            ) { }
        }
        @collection()
        class Dummy {
            constructor(
                @collection.ref([Child])
                public child: Child[]
            ) { }
        }
        const GrandChildModel = model(GrandChild)
        const ChildModel = model(Child)
        const DummyModel = model(Dummy)
        const grandChild = await GrandChildModel.create(<GrandChild>{ stringProp: "string" })
        const child = await ChildModel.create(<Child>{ child: [grandChild._id] })
        const dummy = await DummyModel.create(<Dummy>{ child: [child._id] })
        const result = await DummyModel.findById(dummy._id).populate({
            path: "child",
            populate: {
                path: "child"
            }
        })
        expect(result!.child[0].id).toBe(child._id.toString())
        expect(result!.child[0].child[0].id).toBe(grandChild._id.toString())
        expect(result).toMatchSnapshot()
    })
})