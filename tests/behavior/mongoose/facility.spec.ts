import { Class, route } from "@plumier/core"
import Plumier, { WebApiFacility } from "plumier"
import model, { MongooseFacility, collection } from "@plumier/mongoose"
import supertest = require("supertest")
import Mongoose from "mongoose"
import reflect from "tinspector"
import { fixture } from '../helper'

describe("Automatically replace mongodb id into ObjectId on populate data", () => {
    function createApp(controller: Class, model: Class[]) {
        const app = new Plumier()
        app.set(new WebApiFacility({ controller }))
        app.set(new MongooseFacility({
            uri: "mongodb://localhost:27017/test-data"
        }))
        app.set({ mode: "production" })
        return app.initialize()
    }

    beforeEach(() => Mongoose.models = {})
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
                @collection.ref([Image])
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
        const ImageModel = model(Image)
        const AnimalModel = model(Animal)
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
        const ImageModel = model(Image)
        const fn = jest.fn()
        class AnimalController {
            @route.get(":id")
            async get(id: string) {
                fn(typeof id)
            }
        }
        const koa = await createApp(AnimalController, [Image])

        await supertest(koa.callback())
            .get("/animal/" + Mongoose.Types.ObjectId())
            .expect(200)
        expect(fn.mock.calls[0][0]).toBe("string")
    })
})

describe("Default MongoDB Uri", () => {
    beforeEach(() => Mongoose.models = {})
    afterEach(async () => await Mongoose.disconnect())

    class AnimalController {
        get() {}
    }

    it("Should not connect if no URI provided nor environment variable", async () => {
        const connect = Mongoose.connect
        Mongoose.connect = jest.fn()
        delete process.env.MONGODB_URI
        await fixture(AnimalController)
            .set(new MongooseFacility())
            .initialize()
        expect(Mongoose.connect).not.toBeCalled()
        Mongoose.connect = connect
    })

    it("Should check for PLUM_MONGODB_URI environment variable", async () => {
        process.env.PLUM_MONGODB_URI = "mongodb://localhost:27017/lorem"
        await fixture(AnimalController)
            .set(new MongooseFacility())
            .initialize()
        expect(Mongoose.connection.readyState).toBe(1)
        expect(Mongoose.connection.db.databaseName).toBe("lorem")
    })

})
