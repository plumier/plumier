import { basename } from "path";
import Supertest from "supertest";

import { Plumier, route, WebApiFacility } from "../../src";
import { Class, bind, model } from '../../src/framework';
import { decorateClass } from 'tinspector';
import { Request } from 'koa';
import { IncomingMessage, ServerResponse } from 'http';

export class AnimalModel {
    constructor(
        public id: number,
        public name: string,
        public age: number
    ) { }
}

function fixture(controller: Class) {
    return new Plumier()
        .set(new WebApiFacility())
        .set({ controller: [controller] })
        .set({ mode: "production" })
        .initialize()
}

describe("Parameter Binding", () => {
    describe("Boolean parameter binding", () => {
        class AnimalController {
            @route.get()
            get(b: boolean) { return { b } }
        }
        it("Should convert Truthy as true", async () => {
            const callback = (await fixture(AnimalController)).callback()
            const result = await Promise.all(["ON", "TRUE", "1", "YES"]
                .map(x => Supertest(callback).get(`/animal/get?b=${x}`)))
            expect(result.map(x => x.body.b)).toEqual([true, true, true, true])
        })
        it("Should convert Falsy as false", async () => {
            const callback = (await fixture(AnimalController)).callback()
            const result = await Promise.all(["OFF", "FALSE", "0", "NO"]
                .map(x => Supertest(callback).get(`/animal/get?b=${x}`)))
            expect(result.map(x => x.body.b)).toEqual([false, false, false, false])
        })
        it("Should return {} if value not provided", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get")
                .expect(200, {})
        })
        it("Should return 400 if empty string provided", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=")
                .expect(400, 'Unable to convert "" into Boolean in parameter b')
        })
        it("Should return 400 if any other value provided", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=2")
                .expect(400, 'Unable to convert "2" into Boolean in parameter b')
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=hello")
                .expect(400, 'Unable to convert "hello" into Boolean in parameter b')
        })
        it("Should return string if no decorator provided", async () => {
            class AnimalController {
                get(b: boolean) { return { b } }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=TRUE")
                .expect(200, { b: "TRUE" })
        })
    })

    describe("Number parameter binding", () => {
        class AnimalController {
            @route.get()
            get(b: number) { return { b } }
        }
        it("Should return integer from string", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=123")
                .expect(200, { b: 123 })
        })
        it("Should return negative integer from string", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=-123")
                .expect(200, { b: -123 })
        })
        it("Should return float from string", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=123.4444")
                .expect(200, { b: 123.4444 })
        })
        it("Should return negative float from string", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=-123.4444")
                .expect(200, { b: -123.4444 })
        })
        it("Should return 400 if invalid number", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=hello")
                .expect(400, `Unable to convert "hello" into Number in parameter b`)
        })
        it("Should return 400 if value not provided", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=")
                .expect(400, `Unable to convert "" into Number in parameter b`)
        })
        it("Should return undefined if value not specified", async () => {
            const result = await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get")
                .expect(200)
            expect(result.body).toEqual({})
        })
        it("Should return string if no decorator provided", async () => {
            class AnimalController {
                get(b: number) { return { b } }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=12345")
                .expect(200, { b: "12345" })
        })
    })

    describe("String parameter binding", () => {
        class AnimalController {
            @route.get()
            get(b: string) { return { b } }
        }
        it("Should return integer from string", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=123")
                .expect(200, { b: "123" })
        })
        it("Should return integer from string", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=TRUE")
                .expect(200, { b: "TRUE" })
        })
    })

    describe("Date parameter binding", () => {
        class AnimalController {
            @route.get()
            get(b: Date) { return { b } }
        }
        it("Should return date from string", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=2018-12-22")
                .expect(200, { b: new Date("2018-12-22").toISOString() })
        })
        it("Should return 400 if invalid number", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=hello")
                .expect(400, `Unable to convert "hello" into Date in parameter b`)
        })
        it("Should return 400 if value not provided", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=")
                .expect(400, `Unable to convert "" into Date in parameter b`)
        })
        it("Should return undefined if value not specified", async () => {
            const result = await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get")
                .expect(200)
            expect(result.body).toEqual({})
        })
        it("Should return string if no decorator provided", async () => {
            class AnimalController {
                get(b: number) { return { b } }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=2018-12-22")
                .expect(200, { b: "2018-12-22" })
        })
    })

    describe("Model parameter binding", () => {
        @model()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date
            ) { }
        }
        class AnimalController {
            @route.post()
            save(b: AnimalModel) {
                expect(b).toBeInstanceOf(AnimalModel)
                return b
            }
        }

        it("Should bind model and its properties", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
                .expect(200, { id: 200, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString() })
        })

        it("Should sanitize non member data", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1", excess: "Malicious Script" })
                .expect(200, { id: 200, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString() })
        })

        it("Should skip undefined values", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({ id: "200" })
                .expect(200, { id: 200 })
        })

        it("Should return 400 if provided non convertible value", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({ id: "200", name: "Mimi", deceased: "ON", birthday: "Hello" })
                .expect(400, `Unable to convert "Hello" into Date in parameter b->birthday`)
        })
    })

    describe("Nested model parameter binding", () => {
        @model()
        class TagModel {
            constructor(
                public id: number,
                public name: string,
                public expired: Date
            ) { }
        }
        @model()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date,
                public tag: TagModel
            ) { }
        }
        class AnimalController {
            @route.post()
            save(b: AnimalModel) {
                expect(b).toBeInstanceOf(AnimalModel)
                expect(b.tag).toBeInstanceOf(TagModel)
                return b
            }
        }
        it("Should bind nested model and its properties", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({
                    id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1",
                    tag: { id: "500", name: "Rabies", expired: "2019-1-1" }
                })
                .expect(200, {
                    id: 200, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString(),
                    tag: { id: 500, name: "Rabies", expired: new Date("2019-1-1").toISOString() }
                })
        })

        it("Should sanitize non member data", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({
                    id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1", excess: "Malicious Script",
                    tag: { id: "500", name: "Rabies", expired: "2019-1-1", excess: "Malicious Script" }
                })
                .expect(200, {
                    id: 200, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString(),
                    tag: { id: 500, name: "Rabies", expired: new Date("2019-1-1").toISOString() }
                })
        })

        it("Should skip undefined values", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({ id: "200", tag: { id: "500" } })
                .expect(200, { id: 200, tag: { id: 500 } })
        })

        it("Should return 400 if provided non convertible value", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({
                    id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1",
                    tag: { id: "500", name: "Rabies", expired: "Hello" }
                })
                .expect(400, `Unable to convert "Hello" into Date in parameter b->tag->expired`)
        })
    })

    describe("Array parameter binding", () => {
        it("Should bind array of number", async () => {
            class AnimalController {
                @route.post()
                save(@bind.array(Number) b: number[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send(["1", "2", "3"])
                .expect(200, [1, 2, 3])
        })

        it("Should bind array of boolean", async () => {
            class AnimalController {
                @route.post()
                save(@bind.array(Boolean) b: boolean[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send(["YES", "TRUE", "1", "ON"])
                .expect(200, [true, true, true, true])
        })

        it("Should bind array of Date", async () => {
            class AnimalController {
                @route.post()
                save(@bind.array(Date) b: Date[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send(["2018-1-1", "2018-1-1"])
                .expect(200, [new Date("2018-1-1").toISOString(), new Date("2018-1-1").toISOString()])
        })

        it("Should bind array of Model", async () => {
            @model()
            class AnimalModel {
                constructor(
                    public id: number,
                    public name: string) { }
            }
            class AnimalController {
                @route.post()
                save(@bind.array(AnimalModel) b: AnimalModel[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send([{ id: "123", name: "Mimi" }, { id: "123", name: "Mimi" }])
                .expect(200, [{ id: 123, name: "Mimi" }, { id: 123, name: "Mimi" }])
        })

        it("Should return 400 if provided invalid value", async () => {
            class AnimalController {
                @route.post()
                save(@bind.array(Boolean) b: boolean[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send(["Hello", "TRUE", "1", "ON"])
                .expect(400, `Unable to convert "Hello" into Boolean in parameter b->0`)
        })
    })

    describe("Nested array parameter binding", () => {
        @model()
        class TagModel {
            constructor(
                public id: number,
                public name: string,
            ) { }
        }
        @model()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date,
                @bind.array(TagModel)
                public tags: TagModel[]
            ) { }
        }

        it("Should bind nested array inside model", async () => {
            class AnimalController {
                @route.post()
                save(b: AnimalModel) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({
                    id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1",
                    tags: [{ id: "500", name: "Rabies" }, { id: "600", name: "Rabies Two" }]
                })
                .expect(200, {
                    id: 200, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString(),
                    tags: [{ id: 500, name: "Rabies" }, { id: 600, name: "Rabies Two" }]
                })
        })

        it("Should bind nested array inside array", async () => {
            class AnimalController {
                @route.post()
                save(@bind.array(AnimalModel) b: AnimalModel[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send([{
                    id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1",
                    tags: [{ id: "500", name: "Rabies" }, { id: "600", name: "Rabies Two" }]
                }, {
                    id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1",
                    tags: [{ id: "500", name: "Rabies" }, { id: "600", name: "Rabies Two" }]
                }])
                .expect(200, [{
                    id: 200, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString(),
                    tags: [{ id: 500, name: "Rabies" }, { id: 600, name: "Rabies Two" }]
                }, {
                    id: 200, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString(),
                    tags: [{ id: 500, name: "Rabies" }, { id: 600, name: "Rabies Two" }]
                }])
        })

        it("Should return 400 if provided unconvertible value", async () => {
            class AnimalController {
                @route.post()
                save(@bind.array(AnimalModel) b: AnimalModel[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send([{
                    id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1",
                    tags: "Hello"
                }])
                .expect(400, `Unable to convert "Hello" into Array<TagModel> in parameter b->0->tags`)
        })

        it("Should return 400 if provided unconvertible value", async () => {
            class AnimalController {
                @route.post()
                save(@bind.array(AnimalModel) b: AnimalModel[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send([{
                    id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1",
                    tags: [{ id: "500", name: "Rabies" }, { id: "600", name: "Rabies Two" }]
                }, {
                    id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1",
                    tags: [{ id: "500", name: "Rabies" }, { id: "Hello", name: "Rabies Two" }]
                }])
                .expect(400, `Unable to convert "Hello" into Number in parameter b->1->tags->1->id`)
        })
    })

    describe("Request parameter binding", () => {
        it("Should bind request", async () => {
            class AnimalController {
                @route.get()
                get(@bind.request() b: Request) {
                    expect(b.req).toBeInstanceOf(IncomingMessage)
                    expect(b.res).toBeInstanceOf(ServerResponse)
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get")
                .expect(200)
        })
        it("Should bind request part", async () => {
            class AnimalController {
                @route.get()
                get(@bind.request("ip") b: string) {
                    expect(typeof b).toBe("string")
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get")
                .expect(200)
        })
        it("Should bind req and convert to IncomingMessage", async () => {
            class AnimalController {
                @route.get()
                get(@bind.request("req") b: IncomingMessage) {
                    expect(b).toBeInstanceOf(IncomingMessage)
                    expect(b.url).toEqual("/animal/get")
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get")
                .expect(200)
        })
        it("Should return 400 if provided invalid type", async () => {
            class AnimalController {
                @route.get()
                get(@bind.request("req") b: number) {
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get")
                .expect(400, `Unable to convert "[object Object]" into Number in parameter b`)
        })
    })

    describe("Request body parameter binding", () => {
        @model()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date
            ) { }
        }

        it("Should bind request body", async () => {
            class AnimalController {
                @route.post()
                save(@bind.body() b: AnimalModel) {
                    expect(b).toBeInstanceOf(AnimalModel)
                    return b
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
                .expect(200, { id: 200, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString() })
        })

        it("Should bind request body part", async () => {
            class AnimalController {
                @route.post()
                save(@bind.body("id") b: number) {
                    expect(typeof b).toBe("number")
                    return b
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({ id: "747474", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
                .expect(200, "747474")
        })

        it("Should return 400 if provided non convertible type ", async () => {
            class AnimalController {
                @route.post()
                save(@bind.body("id") b: boolean) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({ id: "747474", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
                .expect(400, `Unable to convert "747474" into Boolean in parameter b`)
        })
    })

    describe("Request header parameter binding", () => {
        it("Should bind request header", async () => {
            class AnimalController {
                @route.post()
                save(@bind.header() b: any) {
                    return b
                }
            }
            const result = await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({ id: "747474", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
                .expect(200)
            expect(result.body).toMatchObject({
                'accept-encoding': 'gzip, deflate',
                'content-type': 'application/json',
                connection: 'close'
            })
        })

        it("Should bind part of request header", async () => {
            class AnimalController {
                @route.post()
                save(@bind.header("content-type") b: string) {
                    return b
                }
            }
            const result = await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({ id: "747474", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
                .expect(200, "application/json")
        })

        it("Should return 400 if provided non convertible type", async () => {
            class AnimalController {
                @route.post()
                save(@bind.header("content-type") b: number) {
                    return b
                }
            }
            const result = await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save")
                .send({ id: "747474", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
                .expect(400, `Unable to convert "application/json" into Number in parameter b`)
        })
    })

    describe("Request query parameter binding", () => {
        @model()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date
            ) { }
        }

        it("Should bind request query", async () => {
            class AnimalController {
                @route.get()
                get(@bind.query() b: AnimalModel) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?id=747474&name=Mimi&deceased=ON&birthday=2018-1-1")
                .expect(200, { id: 747474, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString() })
        })

        it("Should be able to combine with model binding", async () => {
            @model()
            class PagingModel {
                constructor(
                    public start: number,
                    public limit: number
                ) { }
            }
            class AnimalController {
                @route.post()
                save(@bind.query() page: PagingModel, model: AnimalModel) {
                    expect(page).toBeInstanceOf(PagingModel)
                    expect(model).toBeInstanceOf(AnimalModel)
                    return { page, model }
                }
            }
            await Supertest((await fixture(AnimalController)).callback())
                .post("/animal/save?start=200&limit=50")
                .send({ id: "747474", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
                .expect(200, {
                    page: { start: 200, limit: 50 },
                    model: { id: 747474, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString() }
                })
        })

        it("Should bind part of request header", async () => {

        })

        it("Should return 400 if provided non convertible type", async () => {

        })
    })
})

describe("Custom Converter", () => {
    it("Should able to define object converter", () => {

    })

    it("Should use user defined converter vs default converter", () => {

    })
})

describe("Custom Error Message", () => {

})

describe("Static Analysis", () => {

})
