import { consoleLog, domain, route, DefaultFacility, PlumierApplication } from "@plumier/core"
import Plumier, { WebApiFacility } from "plumier"
import Supertest from "supertest"
import { join } from "path"

@domain()
export class AnimalModel {
    constructor(
        public id: number,
        public name: string,
        public age: number
    ) { }
}

//basic controller
export class AnimalController {
    @route.get()
    get(id: number) {
        expect(typeof id).toBe("number")
        return new AnimalModel(id, "Mimi", 5)
    }

    @route.post()
    save(model: AnimalModel) {
        expect(model).toBeInstanceOf(AnimalModel)
        return model
    }

    @route.put()
    modify(id: number, model: AnimalModel) {
        expect(typeof id).toBe("number")
        expect(model).toBeInstanceOf(AnimalModel)
        return { ...model, id }
    }

    @route.delete()
    delete(id: number) {
        expect(typeof id).toBe("number")
        return new AnimalModel(id, "Mimi", 5)
    }
}

function fixture() {
    return new Plumier()
        .set(new WebApiFacility())
        .set({ controller: AnimalController })
        .set({ mode: "production" })
}

describe("Basic Controller", () => {
    it("Should able to perform GET request", async () => {
        const koa = await fixture().initialize()
        await Supertest(koa.callback())
            .get("/animal/get?id=474747")
            .expect(200, { id: 474747, name: 'Mimi', age: 5 })
    })

    it("Should able to perform GET request with case insensitive", async () => {
        const koa = await fixture().initialize()
        await Supertest(koa.callback())
            .get("/animal/get?ID=474747")
            .expect(200, { id: 474747, name: 'Mimi', age: 5 })
    })

    it("Should able to perform POST request", async () => {
        const koa = await fixture().initialize()
        await Supertest(koa.callback())
            .post("/animal/save")
            .send({ id: 474747, name: 'Mimi', age: 5 })
            .expect(200, { id: 474747, name: 'Mimi', age: 5 })
    })

    it("Should able to perform PUT request", async () => {
        const koa = await fixture().initialize()
        await Supertest(koa.callback())
            .put("/animal/modify?id=474747")
            .send({ id: 474747, name: 'Mimi', age: 5 })
            .expect(200, { id: 474747, name: 'Mimi', age: 5 })
    })

    it("Should able to perform PUT request with case insensitive", async () => {
        const koa = await fixture().initialize()
        await Supertest(koa.callback())
            .put("/animal/modify?ID=474747")
            .send({ id: 474747, name: 'Mimi', age: 5 })
            .expect(200, { id: 474747, name: 'Mimi', age: 5 })
    })

    it("Should able to perform DELETE request", async () => {
        const koa = await fixture().initialize()
        await Supertest(koa.callback())
            .delete("/animal/delete?id=474747")
            .expect(200, { id: 474747, name: 'Mimi', age: 5 })
    })

    it("Should able to perform DELETE request with case insensitive", async () => {
        const koa = await fixture().initialize()
        await Supertest(koa.callback())
            .delete("/animal/delete?ID=474747")
            .expect(200, { id: 474747, name: 'Mimi', age: 5 })
    })
})

describe("DEV_ENV", () => {
    beforeEach(() => {
        consoleLog.startMock()
    })

    afterEach(() => {
        consoleLog.clearMock()
    })

    it("Should not print to console if DEV_ENV set to production", async () => {
        process.env["NODE_ENV"] = "production"
        await new Plumier()
            .set(new WebApiFacility())
            .set({ controller: AnimalController })
            .initialize();
        const mock = (console.log as jest.Mock)
        expect(mock).not.toBeCalled()
        delete process.env["NODE_ENV"]
    })

    it("Should print to console if DEV_ENV not set", async () => {
        await new Plumier()
            .set(new WebApiFacility())
            .set({ controller: AnimalController })
            .initialize();
        const mock = (console.log as jest.Mock)
        expect(mock).toBeCalled()
    })
})

describe("Root Directory", () => {
    const fn = jest.fn()
    class MockFacility extends DefaultFacility {
        async initialize(app: PlumierApplication) {
            fn(app.config.rootDir)
        }
    }
    it("Should equals to current directory when not defined", async () => {
        fn.mockClear()
        await fixture()
            .set(new MockFacility())
            .initialize()
        const rootDir = fn.mock.calls[0][0]
        expect(rootDir).toBe(__dirname)
    })

    it("Should able to specify rootDir", async () => {
        fn.mockClear()
        await fixture()
            .set({ rootDir: "/lorem/ipsum" })
            .set(new MockFacility())
            .initialize()
        const rootDir = fn.mock.calls[0][0]
        expect(rootDir).toBe("/lorem/ipsum")
    })
})
