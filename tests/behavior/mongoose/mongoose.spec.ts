import { Class, consoleLog, route } from "@plumier/core"
import { collection, generator, model as globalModel, MongooseFacility, printAnalysis } from "@plumier/mongoose"
import mongoose from "mongoose"
import Plumier, { WebApiFacility } from "plumier"
import supertest from "supertest"
import reflect from "tinspector"
import { fixture } from "../helper"
import { MongoMemoryServer } from "mongodb-memory-server-global"

mongoose.set("useNewUrlParser", true)
mongoose.set("useUnifiedTopology", true)
mongoose.set("useFindAndModify", false)

jest.setTimeout(20000)

describe("Mongoose", () => {
    beforeAll(async () => {
        const mongod = new MongoMemoryServer()
        await mongoose.connect(await mongod.getUri())
    })
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
            } as any)
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
            } as any)
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
            } as any)
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
            const added = await DummyModel.create({} as any)
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
            } as any)
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
            } as any)
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
            } as any)
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
                .set({ mode: "debug" })
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

describe("Facility", () => {
    describe("Automatically replace mongodb id into ObjectId on populate data", () => {
        async function createApp(controller: Class, model: Class[]) {
            const mongod = new MongoMemoryServer()
            const app = new Plumier()
            app.set(new WebApiFacility({ controller }))
            app.set(new MongooseFacility({
                uri: await mongod.getUri()
            }))
            app.set({ mode: "production" })
            return app.initialize()
        }

        beforeEach(() => mongoose.models = {})
        afterEach(async () => await mongoose.disconnect())

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
                    @collection.ref([Image])
                    public images: Image[]
                ) { }
            }
            const ImageModel = globalModel(Image)
            const AnimalModel = globalModel(Animal)
            class AnimalController {
                @route.post()
                async save(data: Animal) {
                    const newly = await new AnimalModel(data).save()
                    return newly._id
                }
            }
            const koa = await createApp(AnimalController, [Image, Animal])
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
                    @collection.ref(Image)
                    public image: Image
                ) { }
            }
            const ImageModel = globalModel(Image)
            const AnimalModel = globalModel(Animal)
            class AnimalController {
                @route.post()
                async save(data: Animal) {
                    const newly = await new AnimalModel(data).save()
                    return newly._id
                }
            }
            const koa = await createApp(AnimalController, [Image, Animal])
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
            const ImageModel = globalModel(Image)
            const fn = jest.fn()
            class AnimalController {
                @route.get(":id")
                async get(id: string) {
                    fn(typeof id)
                }
            }
            const koa = await createApp(AnimalController, [Image])

            await supertest(koa.callback())
                .get("/animal/" + mongoose.Types.ObjectId())
                .expect(200)
            expect(fn.mock.calls[0][0]).toBe("string")
        })
    })

    describe("Default MongoDB Uri", () => {
        beforeEach(() => mongoose.models = {})
        afterEach(async () => await mongoose.disconnect())

        class AnimalController {
            get() { }
        }

        it("Should not connect if no URI provided nor environment variable", async () => {
            const connect = mongoose.connect
            mongoose.connect = jest.fn()
            delete process.env.MONGODB_URI
            await fixture(AnimalController)
                .set(new MongooseFacility())
                .initialize()
            expect(mongoose.connect).not.toBeCalled()
            mongoose.connect = connect
        })

        it("Should check for PLUM_MONGODB_URI environment variable", async () => {
            const mongod = new MongoMemoryServer()
            process.env.PLUM_MONGODB_URI = await mongod.getUri()
            await fixture(AnimalController)
                .set(new MongooseFacility())
                .initialize()
            expect(mongoose.connection.readyState).toBe(1)
            expect(mongoose.connection.db.databaseName).toBe(await mongod.getDbName())
        })

    })
})
