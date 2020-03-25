import { generator, collection, printAnalysis, model as globalModel, MongooseFacility } from "@plumier/mongoose"
import { domain, consoleLog, } from '@plumier/core'
import mongoose from "mongoose"
import reflect from "tinspector"
import { fixture } from '../helper'
import supertest from 'supertest'

mongoose.set("useNewUrlParser", true)
mongoose.set("useUnifiedTopology", true)

const dbUri = "mongodb://localhost:27017/test-data"

describe("Mongoose", () => {
    beforeAll(async () => await mongoose.connect(dbUri))
    afterAll(async () => await mongoose.disconnect())
    beforeEach(() => {
        mongoose.models = {}
        mongoose.connection.models = {}
    })

    describe("Schema Generation", () => {
        it("Should work with primitive data", async () => {
            const { model } = generator()
            @collection()
            class Dummy {
                constructor(
                    public stringProp: string,
                    public numberProp: number,
                    public booleanProp: boolean,
                    public dateProp: Date
                ) { }
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create(<Dummy>{
                excess: "lorem ipsum",
                stringProp: "string",
                numberProp: 123,
                booleanProp: true,
                dateProp: new Date(Date.UTC(2020, 2, 2))
            })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
        })

        it("Should work with primitive array", async () => {
            const { model } = generator()
            @collection()
            class Dummy {
                constructor(
                    @reflect.type([String])
                    public stringProp: string[],
                    @reflect.type([Number])
                    public numberProp: number[],
                    @reflect.type([Boolean])
                    public booleanProp: boolean[],
                    @reflect.type([Date])
                    public dateProp: Date[]
                ) { }
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create(<Dummy>{
                excess: "lorem ipsum",
                stringProp: ["string", "strong"],
                numberProp: [123, 456],
                booleanProp: [true, false],
                dateProp: [new Date(Date.UTC(2020, 2, 2)), new Date(Date.UTC(2020, 2, 3))]
            })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
        })

        it("Should work with nested model", async () => {
            const { model } = generator()
            @collection()
            class Nest {
                constructor(
                    public stringProp: string,
                    public booleanProp: boolean
                ) { }
            }
            @collection()
            class Dummy {
                constructor(
                    public child: Nest
                ) { }
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create(<Dummy>{
                child: {
                    excess: "lorem ipsum",
                    stringProp: "string",
                    booleanProp: true,
                }
            })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
        })

        it("Should work with nested array model", async () => {
            const { model } = generator()
            @collection()
            class Nest {
                constructor(
                    public stringProp: string,
                    public booleanProp: boolean
                ) { }
            }
            @collection()
            class Dummy {
                constructor(
                    @reflect.type([Nest])
                    public children: Nest[]
                ) { }
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create(<Dummy>{
                children: [<Nest>{
                    excess: "lorem ipsum",
                    stringProp: "string",
                    booleanProp: true,
                }]
            })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
        })

        it("Should work with nested model with ref (populate)", async () => {
            const { model } = generator()
            @collection()
            class Nest {
                constructor(
                    public stringProp: string,
                    public booleanProp: boolean
                ) { }
            }
            @collection()
            class Dummy {
                constructor(
                    @collection.ref(Nest)
                    public child: Nest
                ) { }
            }
            const NestModel = model(Nest)
            const DummyModel = model(Dummy)
            const child = await NestModel.create(<Nest>{
                excess: "lorem ipsum",
                stringProp: "string",
                booleanProp: true,
            })
            const added = await DummyModel.create(<Dummy>{
                child: child._id
            })
            const saved = await DummyModel.findById(added._id)
                .populate("child")
            expect(saved).toMatchSnapshot()
        })

        it("Should work with nested array with ref (populate)", async () => {
            const { model } = generator()
            @collection()
            class Nest {
                constructor(
                    public stringProp: string,
                    public booleanProp: boolean
                ) { }
            }
            @collection()
            class Dummy {
                constructor(
                    @collection.ref([Nest])
                    public children: Nest[]
                ) { }
            }
            const NestModel = model(Nest)
            const DummyModel = model(Dummy)
            const child = await NestModel.create(<Nest>{
                excess: "lorem ipsum",
                stringProp: "string",
                booleanProp: true,
            })
            const added = await DummyModel.create(<Dummy>{
                children: [child._id]
            })
            const saved = await DummyModel.findById(added._id)
                .populate("children")
            expect(saved).toMatchSnapshot()
        })

        it("Should throw error when dependent type specified by ref (populate) not registered as model", async () => {
            const { model } = generator()
            @collection()
            class Nest {
                constructor(
                    public stringProp: string,
                    public booleanProp: boolean
                ) { }
            }
            @collection()
            class Dummy {
                constructor(
                    @collection.ref(Nest)
                    public child: Nest
                ) { }
            }
            expect(() => model(Dummy)).toThrowErrorMatchingSnapshot()
        })

        it("Should able to rename collection with different name", async () => {
            const { model } = generator()
            @collection()
            class Dummy {
                constructor(
                    public stringProp: string,
                ) { }
            }
            const DummyModel = model(Dummy, "lorem")
            const added = await DummyModel.create(<Dummy>{ stringProp: "string" })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
            expect(mongoose.models.Dummy).toBeUndefined()
            expect(typeof mongoose.models.lorem).toBe("function")
            expect(DummyModel.collection.name).toBe("lorems")
        })

        it("Should able to rename collection with different name using object configuration", async () => {
            const { model } = generator()
            @collection()
            class Dummy {
                constructor(
                    public stringProp: string,
                ) { }
            }
            const DummyModel = model(Dummy, { name: "lorem" })
            const added = await DummyModel.create(<Dummy>{ stringProp: "string" })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
            expect(mongoose.models.Dummy).toBeUndefined()
            expect(typeof mongoose.models.lorem).toBe("function")
            expect(DummyModel.collection.name).toBe("lorems")
        })

        it("Should able to call model factory multiple time on the same model", async () => {
            const { model } = generator()
            @collection()
            class Dummy {
                constructor(
                    public stringProp: string,
                ) { }
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create(<Dummy>{ stringProp: "string" })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()

            const OtherDummyModel = model(Dummy)
            const otherAdded = await OtherDummyModel.create(<Dummy>{ stringProp: "strong" })
            const otherSaved = await OtherDummyModel.findById(otherAdded._id)
            expect(otherSaved).toMatchSnapshot()
        })

        it("Should able to call model factory multiple time on the same model with custom name", async () => {
            const { model } = generator()
            @collection()
            class Dummy {
                constructor(
                    public stringProp: string,
                ) { }
            }
            const DummyModel = model(Dummy, "lorem")
            const added = await DummyModel.create(<Dummy>{ stringProp: "string" })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()

            const OtherDummyModel = model(Dummy) //call again with type
            const otherAdded = await OtherDummyModel.create(<Dummy>{ stringProp: "strong" })
            const otherSaved = await OtherDummyModel.findById(otherAdded._id)
            expect(otherSaved).toMatchSnapshot()
            expect(mongoose.models.Dummy).toBeUndefined()
            expect(typeof mongoose.models.lorem).toBe("function")
            expect(DummyModel.collection.name).toBe("lorems")
            expect(OtherDummyModel.collection.name).toBe("lorems")
        })
    })

    describe("Schema Configuration", () => {
        it("Should able to specify configuration", async () => {
            const { model } = generator()
            @collection()
            class Dummy {
                constructor(
                    @collection.property({ uppercase: true })
                    public stringProp: string,
                ) { }
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create({
                excess: "lorem ipsum",
                stringProp: "string",
            })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
        })

        it("Should able to use @schema.property() as noop decorator", async () => {
            const { model } = generator()
            class Dummy {
                @collection.property()
                public stringProp: string = ""
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create({
                stringProp: "string",
            })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
        })

        it("Should able to specify default value", async () => {
            const { model } = generator()
            @collection()
            class Dummy {
                constructor(
                    @collection.property({ default: false })
                    public deleted: boolean,
                    public stringProp: string,
                ) { }
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create({
                excess: "lorem ipsum",
                stringProp: "string",
            })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
        })

        it("Should able to specify multiple configuration decorators", async () => {
            const { model } = generator()
            @collection()
            class Dummy {
                constructor(
                    @collection.property({ uppercase: true })
                    @collection.property({ default: "lorem" })
                    public stringProp: string,
                ) { }
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create({})
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()

        })

        it("Should able to specify default value on base class", async () => {
            const { model } = generator()
            @collection()
            class Base {
                @collection.property({ default: false })
                deleted: boolean = false
            }
            @collection()
            class Dummy extends Base {
                constructor(
                    public stringProp: string,
                ) { super() }
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create({
                excess: "lorem ipsum",
                stringProp: "string",
            })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
        })

        it("Should able specify extra configuration from factory", async () => {
            const { model } = generator()
            @collection()
            class Dummy {
                constructor(
                    public stringProp: string,
                ) { }
            }
            const DummyModel = model(Dummy, { timestamps: true })
            const added = await DummyModel.create({
                excess: "lorem ipsum",
                stringProp: "string",
            })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
        })

        it("Should able to enable timestamps using decorator", async () => {
            const { model } = generator()
            @collection({ timestamps: true })
            class Dummy {
                constructor(
                    public stringProp: string,
                ) { }
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create({
                stringProp: "string",
            })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
        })

        it("Should able to enable timestamps using decorator from base class", async () => {
            const { model } = generator()
            @collection({ timestamps: true })
            class Base {
                @collection.property({ default: false })
                deleted: boolean = false
            }
            @collection()
            class Dummy extends Base {
                constructor(
                    public stringProp: string,
                ) { super() }
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create({
                stringProp: "string",
            })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
        })

        it("Should able to override timestamps decorator from factory", async () => {
            const { model } = generator()
            @collection({ timestamps: true })
            class Dummy {
                constructor(
                    public stringProp: string,
                ) { }
            }
            const DummyModel = model(Dummy, { timestamps: false })
            const added = await DummyModel.create({
                stringProp: "string",
            })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
        })

        it("Should able to hook schema generation", async () => {
            const fn = jest.fn()
            const { model } = generator()
            @collection()
            class Dummy {
                constructor(
                    public stringProp: string,
                ) { }
            }
            const DummyModel = model(Dummy, sch => {
                fn(sch)
            })
            const added = await DummyModel.create({
                stringProp: "string",
            })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
            expect(fn).toBeCalled()
        })
    })

    describe("Analyzer", () => {
        it("Should get simple analysis", async () => {
            const { model, getAnalysis } = generator()
            @collection({ timestamps: true })
            class Dummy {
                constructor(
                    public stringProp: string,
                    public numberProp: number,
                    public booleanProp: boolean,
                    public dateProp: Date
                ) { }
            }
            model(Dummy)
            expect(getAnalysis()).toMatchSnapshot()
        })

        it("Should print analysis", async () => {
            const { model, getAnalysis } = generator()
            @collection({ timestamps: true })
            class Dummy {
                constructor(
                    public stringProp: string,
                    public numberProp: number,
                    public booleanProp: boolean,
                    public dateProp: Date
                ) { }
            }
            @collection()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                ) { }
            }
            @collection({ timestamps: true, toObject: { virtuals: true } })
            class UserActivity {
                constructor(
                    public name: string,
                    public email: string,
                ) { }
            }
            model(Dummy)
            model(User)
            model(UserActivity)
            const mock = consoleLog.startMock()
            printAnalysis(getAnalysis())
            expect(mock.mock.calls).toMatchSnapshot()
            consoleLog.clearMock()
        })

        it("Should print analysis on global mode and facility", async () => {
            @collection({ timestamps: true })
            class Dummy {
                constructor(
                    public stringProp: string,
                    public numberProp: number,
                    public booleanProp: boolean,
                    public dateProp: Date
                ) { }
            }
            @collection()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                ) { }
            }
            @collection({ timestamps: true, toObject: { virtuals: true } })
            class UserActivity {
                constructor(
                    public name: string,
                    public email: string,
                ) { }
            }
            globalModel(Dummy)
            globalModel(User)
            globalModel(UserActivity)
            class AnimalController { get() { return { id: 123 } } }
            const mock = consoleLog.startMock()
            const app = await fixture(AnimalController)
                .set({mode: "debug"})
                .set(new MongooseFacility())
                .initialize()
            await supertest(app.callback())
                .get("/animal/get")
                .expect(200, { id: 123 })
            expect(mock.mock.calls).toMatchSnapshot()
            consoleLog.clearMock()
        })
    })
})