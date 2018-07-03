import Supertest from "supertest";

import { HttpStatusError, Plumier, route, WebApiFacility } from "../../src";
import { RestfulApiFacility, Facility } from '../../src/framework';

export class AnimalModel {
    constructor(
        public id: number,
        public name: string,
        public age: number
    ) { }
}

export class ClientModel {
    constructor(
        public id: number,
        public name: string,
        public email: string
    ) { }
}

export class PetModel {
    constructor(
        public id: number,
        public clientId: number,
        public name: string,
        public age: number
    ) { }
}

//basic controller
export class AnimalController {
    @route.get()
    get(id: number) {
        if (typeof id !== "number") throw new HttpStatusError("Not type of id", 400)
        return new AnimalModel(id, "Mimi", 5)
    }

    @route.post()
    save(model: AnimalModel) {
        if (!(model instanceof AnimalModel)) {
            throw new HttpStatusError("Not a type of animal", 400)
        }
        return new AnimalModel(474747, "Mimi", 5)
    }

    @route.put()
    modify(id: number, model: AnimalModel) {
        if (typeof id !== "number") throw new HttpStatusError("Not type of id", 400)
        if (!(model instanceof AnimalModel)) throw new HttpStatusError("Not a type of animal", 400)
        return { ...model, id }
    }

    @route.delete()
    delete(id: number) {
        if (typeof id !== "number") throw new HttpStatusError("Not type of id", 400)
        return new AnimalModel(id, "Mimi", 5)
    }
}

//restful style controller
export class ClientController {
    @route.get(":id")
    get(id: number) {
        return new ClientModel(id, "John Doe", "mimi@gmail.com")
    }

    @route.post("")
    save(model: ClientModel) {
        expect(model).toBeInstanceOf(ClientModel)
        //return the created ID 
        return { newId: 474747 }
    }

    @route.put(":id")
    modify(id: number, model: ClientModel) {
        expect(model).toBeInstanceOf(ClientModel)
        expect(typeof id).toBe("number")
        //return nothing
    }

    @route.delete(":id")
    delete(id: number) {
        expect(typeof id).toBe("number")
        //return nothing
    }
}

//nested restful style controller
@route.root("/client/:clientid/pet")
export class PetController {
    @route.get(":id")
    get(clientId: number, id: number) {
        return new PetModel(id, clientId, "Mimi", 5)
    }

    @route.post("")
    save(clientId: number, model: PetModel) {
        expect(model).toBeInstanceOf(PetModel)
        expect(typeof clientId).toBe("number")
        //return the created ID 
        return { newId: 474747 }
    }

    @route.put(":id")
    modify(clientId: number, id: number, model: PetModel) {
        expect(model).toBeInstanceOf(PetModel)
        expect(typeof clientId).toBe("number")
        expect(typeof id).toBe("number")
        //return nothing
    }

    @route.delete(":id")
    delete(clientId: number, id: number) {
        expect(typeof clientId).toBe("number")
        expect(typeof id).toBe("number")
        //return nothing
    }
}

function fixture(facility:Facility) {
    const app = new Plumier()
    app.set(facility)
    app.set({ rootPath: __dirname, controllerPath: "." })
    app.set({ mode: "production" })
    return app
}

describe("Basic Controller", () => {
    it("Should able to perform GET request with parameter binding", async () => {
        const koa = await fixture(new WebApiFacility()).initialize()
        await Supertest(koa.callback())
            .get("/animal/get?id=474747")
            .expect(200, { id: 474747, name: 'Mimi', age: 5 })
    })

    it("Should able to perform POST request with parameter binding", async () => {
        const koa = await fixture(new WebApiFacility()).initialize()
        await Supertest(koa.callback())
            .post("/animal/save")
            .send({ name: 'Mimi', age: 5 })
            .expect(200, { id: 474747, name: 'Mimi', age: 5 })
    })

    it("Should able to perform PUT request with parameter binding", async () => {
        const koa = await fixture(new WebApiFacility()).initialize()
        await Supertest(koa.callback())
            .put("/animal/modify?id=474747")
            .send({ name: 'Mimi', age: 5 })
            .expect(200, { id: 474747, name: 'Mimi', age: 5 })
    })

    it("Should able to perform DELETE request with parameter binding", async () => {
        const koa = await fixture(new WebApiFacility()).initialize()
        await Supertest(koa.callback())
            .delete("/animal/delete?id=474747")
            .expect(200, { id: 474747, name: 'Mimi', age: 5 })
    })
})

describe("Restful API", () => {
    describe("Basic Restful API", () => {
        it("Should able to get resource", async () => {
            const koa = await fixture(new RestfulApiFacility()).initialize()
            await Supertest(koa.callback())
                .get("/client/474747")
                .expect(200, { id: 474747, name: 'John Doe', email: "mimi@gmail.com" })
        })

        it("Should able to post resource", async () => {
            const koa = await fixture(new RestfulApiFacility()).initialize()
            await Supertest(koa.callback())
                .post("/client")
                .send({ name: 'John Doe', email: "mimi@gmail.com" })
                .expect(201, { newId: 474747 })
        })

        it("Should able to put resource", async () => {
            const koa = await fixture(new RestfulApiFacility()).initialize()
            await Supertest(koa.callback())
                .put("/client/474747")
                .send({ name: 'John Doe', email: "mimi@gmail.com" })
                .expect(204)
        })

        it("Should able to delete resource", async () => {
            const koa = await fixture(new RestfulApiFacility()).initialize()
            await Supertest(koa.callback())
                .delete("/client/474747")
                .expect(204)
        })
    })

    describe("Nested Restful API", () => {
        it("Should able to get resource", async () => {
            const koa = await fixture(new RestfulApiFacility()).initialize()
            await Supertest(koa.callback())
                .get("/client/474747/pet/252525")
                .expect(200, { id: 252525, clientId: 474747, name: 'Mimi', age: 5 })
        })

        it("Should able to post resource", async () => {
            const koa = await fixture(new RestfulApiFacility()).initialize()
            await Supertest(koa.callback())
                .post("/client/474747/pet")
                .send({ name: 'Mimi', age: 5 })
                .expect(201, { newId: 474747 })
        })

        it("Should able to put resource", async () => {
            const koa = await fixture(new RestfulApiFacility()).initialize()
            await Supertest(koa.callback())
                .put("/client/474747/pet/252525")
                .send({ name: 'Mimi', age: 5 })
                .expect(204)
        })

        it("Should able to delete resource", async () => {
            const koa = await fixture(new RestfulApiFacility()).initialize()
            await Supertest(koa.callback())
                .delete("/client/474747/pet/252525")
                .expect(204)
        })
    })
})