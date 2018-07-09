import { basename } from "path";
import Supertest from "supertest";

import { Plumier, route, WebApiFacility } from "../../src";
import { Class } from '../../src/framework';
import { decorateClass } from 'tinspector';

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
        it("Should return integer from string", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=2018-12-22")
                .expect(200, { b: new Date("2018-12-22") })
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

    describe("Model Binding", () => {
        @decorateClass({})
            class AnimalClass {
                constructor(
                    public id: number,
                    public name: string,
                    public deceased: boolean,
                    public birthday: Date
                ) { }
            }
        class AnimalController {
            @route.get()
            get(b: Date) { return { b } }
        }
    })
})

describe("Custom Converter", () => {
    it("Should able to define object converter", () => {

    })

    it("Should use user defined converter vs default converter", () => {

    })
})

describe("Static Analysis", () => {

})
