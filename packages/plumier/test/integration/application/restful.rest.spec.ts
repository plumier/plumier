import Plumier, { RestfulApiFacility, val, rest } from "plumier"
import Supertest from "supertest"

function fixture() {
    return new Plumier()
        .set(new RestfulApiFacility())
        .set({ mode: "production" })
}

describe("Restful API", () => {
    describe("Basic Restful API", () => {
        class ClientModel {
            constructor(
                public name: string,
                public email: string,
                public id?: number,
            ) { }
        }

        //restful style controller
        class ClientController {
            @rest.get(":id")
            get(id: number) {
                return new ClientModel("John Doe", "mimi@gmail.com", id)
            }

            @rest.post()
            save(model: ClientModel) {
                expect(model).toBeInstanceOf(ClientModel)
                //return the created ID 
                return { newId: 474747 }
            }

            @rest.put(":id")
            @rest.patch(":id")
            modify(id: number, model: ClientModel) {
                expect(model).toBeInstanceOf(ClientModel)
                expect(typeof id).toBe("number")
                //return nothing
            }

            @rest.delete(":id")
            delete(id: number) {
                expect(typeof id).toBe("number")
                //return nothing
            }

            @rest.head()
            @rest.options()
            @rest.trace()
            @rest.put()
            @rest.patch()
            @rest.get()
            @rest.delete()
            other(id: number) {
                return { id }
            }

            nonParameterized(){

            }
        }

        it("Should able to get resource", async () => {
            const koa = await fixture()
                .set({ controller: [ClientController] })
                .initialize()
            await Supertest(koa.callback())
                .get("/client/474747")
                .expect(200, { id: 474747, name: 'John Doe', email: "mimi@gmail.com" })
        })

        it("Should able to post resource", async () => {
            const koa = await fixture()
                .set({ controller: [ClientController] })
                .initialize()
            await Supertest(koa.callback())
                .post("/client")
                .send({ name: 'John Doe', email: "mimi@gmail.com" })
                .expect(201, { newId: 474747 })
        })

        it("Should able to put resource", async () => {
            const koa = await fixture()
                .set({ controller: [ClientController] })
                .initialize()
            await Supertest(koa.callback())
                .put("/client/474747")
                .send({ name: 'John Doe', email: "mimi@gmail.com" })
                .expect(204)
        })

        it("Should able to patch resource", async () => {
            const koa = await fixture()
                .set({ controller: [ClientController] })
                .initialize()
            await Supertest(koa.callback())
                .patch("/client/474747")
                .send({ name: 'John Doe', email: "mimi@gmail.com" })
                .expect(200)
        })

        it("Should able to delete resource", async () => {
            const koa = await fixture()
                .set({ controller: [ClientController] })
                .initialize()
            await Supertest(koa.callback())
                .delete("/client/474747")
                .expect(204)
        })

        it("Should able to head resource", async () => {
            const koa = await fixture()
                .set({ controller: [ClientController] })
                .initialize()
            await Supertest(koa.callback())
                .head("/client")
                .expect(200)
        })

        it("Should able to options resource", async () => {
            const koa = await fixture()
                .set({ controller: [ClientController] })
                .initialize()
            await Supertest(koa.callback())
                .options("/client")
                .expect(200)
        })

        it("Should able to trace resource", async () => {
            const koa = await fixture()
                .set({ controller: [ClientController] })
                .initialize()
            await Supertest(koa.callback())
                .trace("/client")
                .expect(200)
        })

    })

    describe("Nested Restful API", () => {
        class PetModel {
            constructor(
                public name: string,
                public age: number,
                public clientI?: number,
                public id?: number,
            ) { }
        }

        //nested restful style controller
        @rest.root("/client/:clientid/pet")
        class PetController {
            @rest.get(":id")
            get(clientId: number, id: number) {
                return new PetModel("Mimi", 5, clientId, id)
            }

            @rest.post()
            save(clientId: number, model: PetModel) {
                expect(model).toBeInstanceOf(PetModel)
                expect(typeof clientId).toBe("number")
                //return the created ID 
                return { newId: 474747 }
            }

            @rest.put(":id")
            modify(clientId: number, id: number, model: PetModel) {
                expect(model).toBeInstanceOf(PetModel)
                expect(typeof clientId).toBe("number")
                expect(typeof id).toBe("number")
                //return nothing
            }

            @rest.delete(":id")
            delete(clientId: number, id: number) {
                expect(typeof clientId).toBe("number")
                expect(typeof id).toBe("number")
                //return nothing
            }
        }

        it("Should able to get resource", async () => {
            const koa = await fixture()
                .set({ controller: [PetController] })
                .initialize()
            await Supertest(koa.callback())
                .get("/client/474747/pet/252525")
                .expect(200, { name: 'Mimi', age: 5, clientI: 474747, id: 252525 })
        })

        it("Should able to post resource", async () => {
            const koa = await fixture()
                .set({ controller: [PetController] })
                .initialize()
            await Supertest(koa.callback())
                .post("/client/474747/pet")
                .send({ name: 'Mimi', age: 5 })
                .expect(201, { newId: 474747 })
        })

        it("Should able to put resource", async () => {
            const koa = await fixture()
                .set({ controller: [PetController] })
                .initialize()
            await Supertest(koa.callback())
                .put("/client/474747/pet/252525")
                .send({ name: 'Mimi', age: 5 })
                .expect(204)
        })

        it("Should able to delete resource", async () => {
            const koa = await fixture()
                .set({ controller: [PetController] })
                .initialize()
            await Supertest(koa.callback())
                .delete("/client/474747/pet/252525")
                .expect(204)
        })
    })
})