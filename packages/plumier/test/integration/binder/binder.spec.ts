import { IncomingMessage, ServerResponse } from "http";
import { Request, Context } from "koa";
import Supertest from "supertest";

import { bind, ConversionError, HttpStatusError, domain, route, array, val, JwtAuthFacility } from "../../../src";
import { fixture } from "../../helper";
import { sign } from 'jsonwebtoken';

export class AnimalModel {
    constructor(
        public id: number,
        public name: string,
        public age: number
    ) { }
}

describe("Parameter Binding", () => {
    describe("Boolean parameter binding", () => {
        class AnimalController {
            @route.get()
            get(b: boolean) { return { b } }
        }
        it("Should convert Truthy as true", async () => {
            const callback = (await fixture(AnimalController).initialize()).callback()
            const result = await Promise.all(["ON", "TRUE", "1", "YES"]
                .map(x => Supertest(callback).get(`/animal/get?b=${x}`)))
            expect(result.map(x => x.body.b)).toEqual([true, true, true, true])
        })
        it("Should convert Falsy as false", async () => {
            const callback = (await fixture(AnimalController).initialize()).callback()
            const result = await Promise.all(["OFF", "FALSE", "0", "NO"]
                .map(x => Supertest(callback).get(`/animal/get?b=${x}`)))
            expect(result.map(x => x.body.b)).toEqual([false, false, false, false])
        })
        it("Should return 422 if value not provided", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get")
                .expect(422, [{ messages: ['Required'], path: ['b'] }])
        })
        it("Should return 422 if empty string provided", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?b=")
                .expect(422, [{ "messages": ["Required"], "path": ["b"] }])
        })
        it("Should return 400 if any other value provided", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?b=2")
                .expect(400, [{ "path": ["b"], "messages": [`Unable to convert "2" into Boolean`] }])
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?b=hello")
                .expect(400, [{ "path": ["b"], "messages": [`Unable to convert "hello" into Boolean`] }])
        })
        it("Should return string if no decorator provided", async () => {
            class AnimalController {
                get(b: boolean) { return { b } }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?b=123")
                .expect(200, { b: 123 })
        })
        it("Should return negative integer from string", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?b=-123")
                .expect(200, { b: -123 })
        })
        it("Should return float from string", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?b=123.4444")
                .expect(200, { b: 123.4444 })
        })
        it("Should return negative float from string", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?b=-123.4444")
                .expect(200, { b: -123.4444 })
        })
        it("Should return 400 if invalid number", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?b=hello")
                .expect(400, [{ "path": ["b"], "messages": [`Unable to convert "hello" into Number`] }])
        })
        it("Should return 422 if value not provided", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?b=")
                .expect(422, [{ "messages": ["Required"], "path": ["b"] }])
        })
        it("Should return 422 if value not specified", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get")
                .expect(422, [{ messages: ["Required"], path: ["b"] }])
        })
        it("Should return string if no decorator provided", async () => {
            class AnimalController {
                get(b: number) { return { b } }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?b=123")
                .expect(200, { b: "123" })
        })
        it("Should return integer from string", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?b=2018-12-22")
                .expect(200, { b: new Date("2018-12-22").toISOString() })
        })
        it("Should return 400 if invalid number", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?b=hello")
                .expect(400, [{ "path": ["b"], "messages": [`Unable to convert "hello" into Date`] }])
        })
        it("Should return 422 if value not provided", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?b=")
                .expect(422, [{ "messages": ["Required"], "path": ["b"] }])
        })
        it("Should return 422 if value not specified", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get")
                .expect(422, [{ messages: ["Required"], path: ["b"] }])
        })
        it("Should return string if no decorator provided", async () => {
            class AnimalController {
                get(b: number) { return { b } }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?b=2018-12-22")
                .expect(200, { b: "2018-12-22" })
        })
    })

    describe("Model parameter binding", () => {
        @domain()
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
                .expect(200, { id: 200, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString() })
        })

        it("Should sanitize non member data", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1", excess: "Malicious Script" })
                .expect(200, { id: 200, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString() })
        })

        it("Should return 400 if provided non convertible value", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send({ id: "200", name: "Mimi", deceased: "ON", birthday: "Hello" })
                .expect(400, [{ "path": ["b", "birthday"], "messages": [`Unable to convert "Hello" into Date`] }])
        })

        it("Should provide informative error when model instantiation failed", async () => {
            @domain()
            class AnimalModel {
                constructor() {
                    throw new Error("ERROR")
                }
            }
            class AnimalController {
                @route.post()
                save(b: AnimalModel) {
                    expect(b).toBeInstanceOf(AnimalModel)
                    return b
                }
            }
            const koa = await fixture(AnimalController).initialize()
            let error = false
            koa.on("error", (e) => {
                expect(e.message).toContain("PLUM2000")
                error = true
            })
            await Supertest(koa.callback())
                .post("/animal/save")
                .send({ id: "200", name: "Mimi", deceased: "ON", birthday: "Hello" })
                .expect(500, `Internal Server Error`)
            expect(error).toBe(true)
        })

        it("Should provide informative error when model instantiation failed and throws non Error instance", async () => {
            @domain()
            class AnimalModel {
                constructor() {
                    throw "Other error"
                }
            }
            class AnimalController {
                @route.post()
                save(b: AnimalModel) {
                    expect(b).toBeInstanceOf(AnimalModel)
                    return b
                }
            }
            const koa = await fixture(AnimalController).initialize()
            let error = false
            koa.on("error", (e) => {
                expect(e.message).toContain("PLUM2000")
                error = true
            })
            await Supertest(koa.callback())
                .post("/animal/save")
                .send({ id: "200", name: "Mimi", deceased: "ON", birthday: "Hello" })
                .expect(500, `Internal Server Error`)
            expect(error).toBe(true)
        })
    })

    describe("Nested model parameter binding", () => {
        @domain()
        class TagModel {
            constructor(
                public id: number,
                public name: string,
                public expired: Date
            ) { }
        }
        @domain()
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
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

        it("Should return 400 if provided non convertible value", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send({
                    id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1",
                    tag: { id: "500", name: "Rabies", expired: "Hello" }
                })
                .expect(400, [{ "path": ["b", "tag", "expired"], "messages": [`Unable to convert "Hello" into Date`] }])
        })

        it("Should return 400 if provided non convertible value on model", async () => {
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send({
                    id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1",
                    tag: "Hello"
                })
                .expect(400, [{ "path": ["b", "tag"], "messages": [`Unable to convert "Hello" into TagModel`] }])
        })
    })

    describe("Array parameter binding", () => {
        it("Should bind array of number", async () => {
            class AnimalController {
                @route.post()
                save(@array(Number) b: number[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send(["1", "2", "3"])
                .expect(200, [1, 2, 3])
        })

        it("Should bind array of number using url encoded", async () => {
            class AnimalController {
                @route.post()
                save(@array(Number) b: number[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send("b=1")
                .send("b=2")
                .send("b=3")
                .expect(200, [1, 2, 3])
        })

        it("Should allow single value on url encoded as array", async () => {
            class AnimalController {
                @route.post()
                save(@array(Number) b: number[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send("b=1")
                .expect(200, [1])
        })

        it("Should bind array of boolean", async () => {
            class AnimalController {
                @route.post()
                save(@array(Boolean) b: boolean[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send(["YES", "TRUE", "1", "ON"])
                .expect(200, [true, true, true, true])
        })

        it("Should bind array of Date", async () => {
            class AnimalController {
                @route.post()
                save(@array(Date) b: Date[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send(["2018-1-1", "2018-1-1"])
                .expect(200, [new Date("2018-1-1").toISOString(), new Date("2018-1-1").toISOString()])
        })

        it("Should bind array of Model", async () => {
            @domain()
            class AnimalModel {
                constructor(
                    public id: number,
                    public name: string) { }
            }
            class AnimalController {
                @route.post()
                save(@array(AnimalModel) b: AnimalModel[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send([{ id: "123", name: "Mimi" }, { id: "123", name: "Mimi" }])
                .expect(200, [{ id: 123, name: "Mimi" }, { id: 123, name: "Mimi" }])
        })

        it("Should return 400 if provided invalid value", async () => {
            class AnimalController {
                @route.post()
                save(@array(Boolean) b: boolean[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send(["Hello", "TRUE", "1", "ON"])
                .expect(400, [{ "path": ["b", "0"], "messages": [`Unable to convert "Hello" into Boolean`] }])
        })
    })

    describe("Nested array parameter binding", () => {
        @domain()
        class TagModel {
            constructor(
                public id: number,
                public name: string,
            ) { }
        }
        @domain()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean,
                public birthday: Date,
                @array(TagModel)
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
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
                save(@array(AnimalModel) b: AnimalModel[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
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
                save(@array(AnimalModel) b: AnimalModel[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send([{
                    id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1",
                    tags: "Hello"
                }])
                .expect(400, [{ "path": ["b", "0", "tags", "0"], "messages": [`Unable to convert "Hello" into TagModel`] }])
        })

        it("Should return 400 if provided unconvertible value", async () => {
            class AnimalController {
                @route.post()
                save(@array(AnimalModel) b: AnimalModel[]) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send([{
                    id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1",
                    tags: [{ id: "500", name: "Rabies" }, { id: "600", name: "Rabies Two" }]
                }, {
                    id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1",
                    tags: [{ id: "500", name: "Rabies" }, { id: "Hello", name: "Rabies Two" }]
                }])
                .expect(400, [{ "path": ["b", "1", "tags", "1", "id"], "messages": [`Unable to convert "Hello" into Number`] }])
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get")
                .expect(200)
        })
        it("Should return 400 if provided invalid type", async () => {
            class AnimalController {
                @route.get()
                get(@bind.request("req") b: number) {
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get")
                .expect(400, [{ "path": ["b"], "messages": [`Unable to convert "[object Object]" into Number`] }])
        })
        it("Should return 400 if provided invalid type on whole request", async () => {
            class AnimalController {
                @route.get()
                get(@bind.request() b: number) {
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get")
                .expect(400, [{ "path": ["b"], "messages": [`Unable to convert "[object Object]" into Number`] }])
        })
    })

    describe("Request body parameter binding", () => {
        @domain()
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send({ id: "747474", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
                .expect(400, [{ "path": ["b"], "messages": [`Unable to convert "747474" into Boolean`] }])
        })

        it("Should return 400 if provided non convertible type on whole body", async () => {
            class AnimalController {
                @route.post()
                save(@bind.body() b: boolean) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send({ id: "747474", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
                .expect(400, [{ "path": ["b"], "messages": [`Unable to convert "[object Object]" into Boolean`] }])
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
            const result = await Supertest((await fixture(AnimalController).initialize()).callback())
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send({})
                .expect(400, [{ "path": ["b"], "messages": [`Unable to convert "application/json" into Number`] }])
        })

        it("Should return 400 if provided non convertible type on whole header", async () => {
            class AnimalController {
                @route.post()
                save(@bind.header() b: number) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save")
                .send({})
                .expect(400, [{ "path": ["b"], "messages": [`Unable to convert "[object Object]" into Number`] }])
        })
    })

    describe("Request query parameter binding", () => {
        @domain()
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?id=747474&name=Mimi&deceased=ON&birthday=2018-1-1")
                .expect(200, { id: 747474, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString() })
        })

        it("Should be able to combine with model binding", async () => {
            @domain()
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
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/save?start=200&limit=50")
                .send({ id: "747474", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
                .expect(200, {
                    page: { start: 200, limit: 50 },
                    model: { id: 747474, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString() }
                })
        })

        it("Should bind part of request header", async () => {
            class AnimalController {
                @route.get()
                get(@bind.query("id") b: number) {
                    expect(typeof b).toEqual("number")
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?id=747474&name=Mimi&deceased=ON&birthday=2018-1-1")
                .expect(200, "747474")
        })

        it("Should return 400 if provided non convertible type", async () => {
            class AnimalController {
                @route.get()
                get(@bind.query("id") b: boolean) {
                    expect(typeof b).toEqual("number")
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?id=747474&name=Mimi&deceased=ON&birthday=2018-1-1")
                .expect(400, [{ "path": ["b"], "messages": [`Unable to convert "747474" into Boolean`] }])
        })

        it("Should return 400 if provided non convertible type on whole query", async () => {
            class AnimalController {
                @route.get()
                get(@bind.query() b: number) {
                    return b
                }
            }

            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?id=747474&name=Mimi&deceased=ON&birthday=2018-1-1")
                .expect(400, [{ "path": ["b"], "messages": [`Unable to convert "[object Object]" into Number`] }])
        })
    })

    describe("Context parameter binding", () => {
        it("Should able to bind context", async () => {
            class AnimalController {
                @route.get()
                get(@bind.ctx() b: Context) {
                    return b.request.query
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?id=747474&name=Mimi&deceased=ON&birthday=2018-1-1")
                .expect(200, { id: '747474', name: 'Mimi', deceased: 'ON', birthday: '2018-1-1' })
        })

        it("Should be able to get part of context using dot", async () => {
            @domain()
            class AnimalModel {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    public birthday: Date
                ) { }
            }
            class AnimalController {
                @route.get()
                get(@bind.ctx("request.query") b: AnimalModel) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .get("/animal/get?id=747474&name=Mimi&deceased=ON&birthday=2018-1-1")
                .expect(200, { id: 747474, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString() })
        })

        it("Should be able to get part of context using array notation", async () => {
            @domain()
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
                get(@bind.ctx("request.body[0]") b: AnimalModel) {
                    return b
                }
            }
            await Supertest((await fixture(AnimalController).initialize()).callback())
                .post("/animal/get")
                .send([{ id: '747474', name: 'Mimi', deceased: 'ON', birthday: '2018-1-1' }])
                .expect(200, { id: 747474, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString() })
        })
    })

    describe("User parameter binding", () => {
        it("Should able to bind user", async () => {
            const SECRET = "Lorem Ipsum Dolor"
            const TOKEN = sign({ email: "ketut@gmail.com", role: "Admin" }, SECRET)
            @domain()
            class User {
                constructor(
                    public email: string,
                    public role: "Admin" | "User"
                ) { }
            }

            class AnimalController {
                @route.get()
                get(@bind.user() b: User) {
                    return b
                }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()
            const result = await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${TOKEN}`)
                .expect(200)
            expect(result.body).toMatchObject({ email: "ketut@gmail.com", role: "Admin" })
        })
    })

    describe("Binding body to parameters", () => {
        it("Should able to bind body to parameters to limit usage of domain model", async () => {
            class AnimalController {
                @route.post()
                save(id: number, name: string, deceased: boolean, birthday: Date) {
                    return { id, name, deceased, birthday }
                }
            }
            const koa = await fixture(AnimalController).initialize()
            await Supertest(koa.callback())
                .post("/animal/save")
                .send({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
                .expect(200, { id: 200, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString() })
        })

        it("Should be able to bind parameters with nested model", async () => {
            @domain()
            class Name {
                constructor(
                    public first: string,
                    public last: string
                ) { }
            }
            class AnimalController {
                @route.post()
                save(id: number, name: Name, deceased: boolean, birthday: Date) {
                    return { id, name, deceased, birthday }
                }
            }
            const koa = await fixture(AnimalController).initialize()
            await Supertest(koa.callback())
                .post("/animal/save")
                .send({ id: "200", name: { first: "Mimi", last: "Dog" }, deceased: "ON", birthday: "2018-1-1" })
                .expect(200, { id: 200, name: { first: "Mimi", last: "Dog" }, deceased: true, birthday: new Date("2018-1-1").toISOString() })
        })

        it("Should be able to mix body binding with query binding", async () => {
            class AnimalController {
                @route.post()
                save(type: string, id: number, name: string, deceased: boolean, birthday: Date) {
                    return { id, name, deceased, birthday, type }
                }
            }
            const koa = await fixture(AnimalController).initialize()
            await Supertest(koa.callback())
                .post("/animal/save?type=HappyAnimal")
                .send({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
                .expect(200, { id: 200, name: "Mimi", deceased: true, birthday: new Date("2018-1-1").toISOString(), type: "HappyAnimal" })
        })
    })

})

describe("Custom Converter", () => {
    it("Should able to define object converter", async () => {
        class AnimalModel {
            id: number
            name: string
            deceased: boolean
            birthday: Date
            constructor(@val.optional() json: any) {
                json = json || {}
                this.id = json.id;
                this.name = json.name
                this.deceased = json.deceased
                this.birthday = json.birthday
            }
        }
        class AnimalController {
            @route.post()
            save(b: AnimalModel) {
                expect(b).toBeInstanceOf(AnimalModel)
                return b
            }
        }
        const koa = await fixture(AnimalController)
            .set({ converters: [{ type: AnimalModel, converter: (value) => new AnimalModel(value) }] })
            .initialize()
        await Supertest(koa.callback())
            .post("/animal/save")
            .send({ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
            .expect(200, { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" })
    })
})
