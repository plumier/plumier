import { authorize, Class, route } from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import model, { collection, getModels, model as globalModel, MongooseFacility, MongooseHelper, Ref, transformFilter } from "@plumier/mongoose"
import { MongoMemoryServer } from "mongodb-memory-server-global"
import mongoose from "mongoose"
import Plumier, { WebApiFacility } from "plumier"
import supertest from "supertest"
import reflect, { noop } from "tinspector"

import { fixture } from "../helper"
import { ChildModel, } from "./cross-dependent/child"
import { ParentModel, } from "./cross-dependent/parent"

mongoose.set("useNewUrlParser", true)
mongoose.set("useUnifiedTopology", true)
mongoose.set("useFindAndModify", false)

jest.setTimeout(20000)

describe("Mongoose", () => {
    let server: MongoMemoryServer | undefined
    beforeAll(async () => {
        server = new MongoMemoryServer()
        await mongoose.connect(await server.getUri())
    })
    afterAll(async () => {
        await mongoose.disconnect()
        await server?.stop()
    })
    beforeEach(() => {
        mongoose.models = {}
        mongoose.connection.models = {}
    })

    describe("Schema Generation", () => {
        it("Should work with primitive data", async () => {
            const { model } = new MongooseHelper(mongoose)
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
            const { model } = new MongooseHelper(mongoose)
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
            const { model } = new MongooseHelper(mongoose)
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
            const { model } = new MongooseHelper(mongoose)
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

        it("Should automatically generate schema for ref properties", async () => {
            const { model, getModels } = new MongooseHelper(mongoose)
            @collection()
            class GrandChildNest {
                constructor(
                    public stringProp: string,
                    public booleanProp: boolean
                ) { }
            }
            @collection()
            class ChildNest {
                constructor(
                    public stringProp: string,
                    public booleanProp: boolean,
                    @collection.ref([GrandChildNest])
                    public child:GrandChildNest[]
                ) { }
            }
            @collection()
            class Nest {
                constructor(
                    public stringProp: string,
                    public booleanProp: boolean,
                    @collection.ref(ChildNest)
                    public child:ChildNest
                ) { }
            }
            @collection()
            class Dummy {
                constructor(
                    @collection.ref(Nest)
                    public child: Nest
                ) { }
            }
            model(Dummy)
            const models = getModels()
            expect(models).toMatchSnapshot()
        })

        it("Should work domain with inheritance", async () => {
            const { model } = new MongooseHelper(mongoose)
            @collection({ timestamps: true, toJSON: { virtuals: true, versionKey: false } })
            class Domain {
                @noop()
                id?: string
                @noop()
                createdAt?: Date
                @noop()
                updatedAt?: Date
                @collection.property({ default: false })
                deleted?: boolean
            }

            @collection()
            class Dummy extends Domain {
                constructor(
                    @reflect.type([String])
                    public stringProp: string[]
                ) { super() }
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create(<Dummy>{
                stringProp: ["string", "strong"],
            })
            const saved = await DummyModel.findById(added._id)
            const object = saved?.toObject()
            expect(mongoose.isValidObjectId(object.id)).toBe(true)
        })

        it("Should work with nested model with ref (populate)", async () => {
            const { model } = new MongooseHelper(mongoose)
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
            const { model } = new MongooseHelper(mongoose)
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

        it("Should work with cyclic reference model", async () => {
            const { model } = new MongooseHelper(mongoose)
            @collection()
            class Nest {
                constructor(
                    public stringProp: string,
                    public booleanProp: boolean,
                    @collection.ref(x => Dummy)
                    public dummy: Ref<Dummy>
                ) { }
            }
            @collection()
            class Dummy {
                constructor(
                    public name: string,
                    @collection.ref(x => [Nest])
                    public children: Nest[]
                ) { }
            }
            const NestModel = model(Nest)
            const DummyModel = model(Dummy)
            const child = await NestModel.create(<Nest>{
                stringProp: "string",
                booleanProp: true,
            })
            const added = await DummyModel.create(<Dummy>{
                name: "lorem",
                children: [child._id]
            })
            await NestModel.findByIdAndUpdate(child.id, { dummy: added._id })
            const saved = await DummyModel.findById(added._id)
                .populate("children", { dummy: 0 })
            const savedNest = await NestModel.findById(child._id)
                .populate("dummy", { children: 0 })
            expect(saved).toMatchSnapshot()
            expect(savedNest).toMatchSnapshot()
        })

        it("Should work with cyclic reference model with custom name", async () => {
            const { model } = new MongooseHelper(mongoose)
            @collection({ name: "lorem" })
            class Nest {
                constructor(
                    public stringProp: string,
                    public booleanProp: boolean,
                    @collection.ref(x => Dummy)
                    public dummy: Ref<Dummy>
                ) { }
            }
            @collection({ name: "ipsum" })
            class Dummy {
                constructor(
                    public name: string,
                    @collection.ref(x => [Nest])
                    public children: Nest[]
                ) { }
            }
            const NestModel = model(Nest)
            const DummyModel = model(Dummy)
            const child = await NestModel.create(<Nest>{
                stringProp: "string",
                booleanProp: true,
            })
            const added = await DummyModel.create(<Dummy>{
                name: "lorem",
                children: [child._id]
            })
            await NestModel.findByIdAndUpdate(child.id, { dummy: added._id })
            const saved = await DummyModel.findById(added._id)
                .populate("children", { dummy: 0 })
            const savedNest = await NestModel.findById(child._id)
                .populate("dummy", { children: 0 })
            expect(saved).toMatchSnapshot()
            expect(savedNest).toMatchSnapshot()
        })

        it("Should able to rename collection with different name", async () => {
            const { model } = new MongooseHelper(mongoose)
            @collection({ name: "lorem" })
            class Dummy {
                constructor(
                    public stringProp: string,
                ) { }
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create(<Dummy>{ stringProp: "string" })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
            expect(mongoose.models.Dummy).toBeUndefined()
            expect(typeof mongoose.models.lorem).toBe("function")
            expect(DummyModel.collection.name).toBe("lorems")
        })

        it("Should able to call model factory multiple time on the same model", async () => {
            const { model } = new MongooseHelper(mongoose)
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
            const { model } = new MongooseHelper(mongoose)
            @collection({ name: "lorem" })
            class Dummy {
                constructor(
                    public stringProp: string,
                ) { }
            }
            const DummyModel = model(Dummy)
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

        it("Should able to hook schema generation", async () => {
            const { model } = new MongooseHelper(mongoose)
            @collection({
                hook: (schema) => {
                    schema.pre("save", async function (this: Dummy & mongoose.Document) {
                        const newString = await new Promise<string>(resolve => setTimeout(() => resolve("Delayed"), 100))
                        this.stringProp = newString
                    })
                }
            })
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

        it("Should able to use preSave using decorator", async () => {
            const { model } = new MongooseHelper(mongoose)
            @collection()
            class Dummy {
                constructor(
                    public stringProp: string,
                    public numberProp: number,
                    public booleanProp: boolean,
                    public dateProp: Date
                ) { }

                @collection.preSave()
                async beforeSave() {
                    this.stringProp = await new Promise<string>(resolve => setTimeout(() => resolve("Delayed"), 100))
                }
            }
            const DummyModel = model(Dummy)
            const added = await DummyModel.create({
                stringProp: "string",
                numberProp: 123,
                booleanProp: true,
                dateProp: new Date(Date.UTC(2020, 2, 2))
            })
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
        })
    })

    describe("Proxy", () => {
        it("Should work with simple model", async () => {
            const { proxy } = new MongooseHelper(mongoose)
            @collection()
            class Dummy {
                constructor(
                    public stringProp: string,
                    public numberProp: number,
                    public booleanProp: boolean,
                    public dateProp: Date
                ) { }
            }
            const DummyModel = proxy(Dummy)
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
        it("Should work with instance of simple model", async () => {
            const { proxy } = new MongooseHelper(mongoose)
            @collection()
            class Dummy {
                constructor(
                    public stringProp: string,
                    public numberProp: number,
                    public booleanProp: boolean,
                    public dateProp: Date
                ) { }
            }
            const DummyModel = proxy(Dummy)
            const added = await new DummyModel(<Dummy>{
                excess: "lorem ipsum",
                stringProp: "string",
                numberProp: 123,
                booleanProp: true,
                dateProp: new Date(Date.UTC(2020, 2, 2))
            }).save()
            added.stringProp = "modified"
            await added.save()
            const saved = await DummyModel.findById(added._id)
            expect(saved).toMatchSnapshot()
        })
        it("Should possible to call more than once", async () => {
            const { proxy } = new MongooseHelper(mongoose)
            @collection()
            class Dummy {
                constructor(
                    public stringProp: string,
                    public numberProp: number,
                    public booleanProp: boolean,
                    public dateProp: Date
                ) { }
            }
            const DummyModel = proxy(Dummy)
            const OtherDummyModel = proxy(Dummy)
        })
        it("Should able to provide toString()", async () => {
            const { proxy } = new MongooseHelper(mongoose)
            @collection()
            class Dummy {
                constructor(
                    public stringProp: string,
                    public numberProp: number,
                    public booleanProp: boolean,
                    public dateProp: Date
                ) { }
            }
            const DummyModel = proxy(Dummy)
            expect(DummyModel.toString()).toMatchSnapshot()
        })
        it("Should fix circular reference issue", async () => {
            const { proxy } = new MongooseHelper(mongoose)
            @collection()
            class Child {
                @noop()
                name: string

                @collection.ref(x => Parent)
                parent: Ref<Parent>
            }
            const ChildModel = proxy(Child)
            @collection()
            class Parent {
                @noop()
                name: string

                @collection.ref(x => [Child])
                children: Child[]
            }
            const ParentModel = proxy(Parent)
            const parent = await new ParentModel({ name: "parent" }).save()
            const child = await new ChildModel({ name: "child" }).save()
            child.parent = parent._id
            await child.save()
            parent.children = [child._id]
            await parent.save()
            const saved = await ParentModel.findById(parent.id).populate("children")
            saved!.children[0].parent = undefined as any
            expect(saved).toMatchSnapshot()
        })
        it("Should work with external circular dependency model", async () => {
            const { model } = new MongooseHelper(mongoose)
            const parent = await ParentModel.create({ name: "Parent" } as any)
            const child = await ChildModel.create({ name: "Child" } as any)
            expect(parent).toMatchSnapshot()
            expect(child).toMatchSnapshot()
        })
    })

    describe("Schema Configuration", () => {
        it("Should able to specify configuration", async () => {
            const { model } = new MongooseHelper(mongoose)
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
            const { model } = new MongooseHelper(mongoose)
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
            const { model } = new MongooseHelper(mongoose)
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
            const { model } = new MongooseHelper(mongoose)
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
            const { model } = new MongooseHelper(mongoose)
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

        it("Should able to enable timestamps using decorator", async () => {
            const { model } = new MongooseHelper(mongoose)
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
            const { model } = new MongooseHelper(mongoose)
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
    })

    describe("Mongoose Multiple Instance", () => {
        it("Should be able to host multiple instance of mongoose helper", async () => {
            const one = new MongooseHelper()
            const two = new MongooseHelper()
            @collection()
            class User {
                constructor(
                    public name: string,
                ) { }
            }
            const UserOneModel = one.model(User)
            const UserTwoModel = two.model(User)
            await new Plumier()
                .set({ mode: "production" })
                .set(new MongooseFacility({ uri: await server?.getUri(), helper: one }))
                .set(new MongooseFacility({ uri: await server?.getUri(), helper: two }))
                .initialize()
            const newly = await new UserOneModel({ name: "John Doe" }).save()
            const saved = await UserTwoModel.findById(newly._id)
            expect(newly.name).toBe("John Doe")
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
            app.set(new JwtAuthFacility({ secret: "secret" }))
            app.set({ mode: "production" })
            return app.initialize()
        }

        beforeEach(() => mongoose.models = {})
        afterEach(async () => await mongoose.disconnect())

        it("Should work on nested object", async () => {
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
                @authorize.public()
                async save(data: Animal) {
                    const newly = await new AnimalModel(data).save()
                    return newly._id
                }
            }
            const koa = await createApp(AnimalController, [Image, Animal])
            const image = await new ImageModel({ name: "Image1.jpg" }).save()
            const response = await supertest(koa.callback())
                .post("/animal/save")
                .send({ name: "Mimi", image: image.id })
                .expect(200)
            const result = await AnimalModel.findById(response.body)
                .populate("image")
            expect(result).toMatchSnapshot()
        })

        it("Should validate properly on nested object", async () => {
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
                @authorize.public()
                async save(data: Animal) {
                    const newly = await new AnimalModel(data).save()
                    return newly._id
                }
            }
            const koa = await createApp(AnimalController, [Image, Animal])
            const response = await supertest(koa.callback())
                .post("/animal/save")
                .send({ name: "Mimi", image: "lorem" })
                .expect(422)
            expect(response.body).toMatchSnapshot()
        })

        it("Should not error when provided undefined", async () => {
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
                @authorize.public()
                async save(data: Animal) {
                    const newly = await new AnimalModel(data).save()
                    return newly._id
                }
            }
            const koa = await createApp(AnimalController, [Image, Animal])
            await supertest(koa.callback())
                .post("/animal/save")
                .send({ name: "Mimi" })
                .expect(200)
        })

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
                @authorize.public()
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
                .send({ name: "Mimi", images: [image1.id, image2.id] })
                .expect(200)
            const result = await AnimalModel.findById(response.body)
                .populate("images")
            expect(result!.images[0].name).toBe("Image1.jpg")
            expect(result!.images[1].name).toBe("Image2.jpg")
        })

        it("Should validate properly on Array", async () => {
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
                @authorize.public()
                async save(data: Animal) {
                    const newly = await new AnimalModel(data).save()
                    return newly._id
                }
            }
            const koa = await createApp(AnimalController, [Image, Animal])
            const image = await new ImageModel({ name: "Image1.jpg" }).save()
            const response = await supertest(koa.callback())
                .post("/animal/save")
                .send({ name: "Mimi", images: [image.id, "lorem"] })
                .expect(422)
            expect(response.body).toMatchSnapshot()
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
                @authorize.public()
                async save(data: Animal) {
                    const newly = await new AnimalModel(data).save()
                    return newly._id
                }
            }
            const koa = await createApp(AnimalController, [Image, Animal])
            const image1 = await new ImageModel({ name: "Image1.jpg" }).save()

            const response = await supertest(koa.callback())
                .post("/animal/save")
                .send({ name: "Mimi", image: image1.id })
                .expect(200)
            const result = await AnimalModel.findById(response.body)
                .populate("image")
            expect(result!.image.name).toBe("Image1.jpg")
        })

        it("Should work with nested object with readonly id", async () => {
            @collection()
            class Image {
                constructor(
                    @authorize.readonly()
                    public id: string,
                    public name: string
                ) { }
            }
            @collection()
            class Animal {
                constructor(
                    public id: string,
                    public name: string,
                    @collection.ref(Image)
                    public image: Image
                ) { }
            }
            const ImageModel = globalModel(Image)
            const AnimalModel = globalModel(Animal)
            class AnimalController {
                @route.post()
                @authorize.public()
                async save(data: Animal) {
                    const newly = await new AnimalModel(data).save()
                    return newly._id
                }
            }
            const koa = await createApp(AnimalController, [Image, Animal])
            const image1 = await new ImageModel({ name: "Image1.jpg" }).save()

            const response = await supertest(koa.callback())
                .post("/animal/save")
                .send({ name: "Mimi", image: image1.id })
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
            globalModel(Image)
            const fn = jest.fn()
            class AnimalController {
                @route.get(":id")
                @authorize.public()
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

describe("Filter Transformer", () => {
    it("Should transform exact filter", () => {
        expect(transformFilter({ name: { type: "exact", value: "lorem" } })).toMatchSnapshot()
    })
    it("Should transform partial filter", () => {
        expect(transformFilter({ name: { type: "partial", partial: "start", value: "lorem" } })).toMatchSnapshot()
        expect(transformFilter({ name: { type: "partial", partial: "end", value: "lorem" } })).toMatchSnapshot()
        expect(transformFilter({ name: { type: "partial", partial: "both", value: "lorem" } })).toMatchSnapshot()
    })
    it("Should transform range filter", () => {
        expect(transformFilter({ name: { type: "range", value: [1,2] } })).toMatchSnapshot()
    })
    it("Should able to combine all", () => {
        expect(transformFilter({ 
            name: { type: "exact", value: "lorem" } ,
            age: { type: "range", value: [1,2] },
            address: { type: "partial", partial: "end", value: "lorem" } 
        })).toMatchSnapshot()
    })
})