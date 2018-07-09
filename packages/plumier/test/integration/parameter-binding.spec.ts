import { basename } from "path";
import Supertest from "supertest";

import { Plumier, route, WebApiFacility } from "../../src";
import { Class } from '../../../../node_modules/plumier/src/framework';

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
        it("Should convert ON as true", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=ON")
                .expect(200, { b: true })
        })
        it("Should convert On as true", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=On")
                .expect(200, { b: true })
        })
        it("Should convert on as true", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=on")
                .expect(200, { b: true })
        })
        it("Should convert TRUE as true", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=TRUE")
                .expect(200, { b: true })
        })
        it("Should convert True as true", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=True")
                .expect(200, { b: true })
        })
        it("Should convert true as true", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=true")
                .expect(200, { b: true })
        })
        it("Should convert 1 as true", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=1")
                .expect(200, { b: true })
        })
        it("Should not error if value not provided", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get")
                .expect(200, {})
        })
        it("Should return false if empty string provided", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=")
                .expect(200, { b: false })
        })
        it("Should anything else as false", async () => {
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=2")
                .expect(200, { b: false })
            await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=hello")
                .expect(200, { b: false })
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
        it("Should return null from invalid number", async () => {
            const result = await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=hello")
                .expect(200)
            expect(result.body).toEqual({ b: null })
        })
        it("Should return null if value not provided", async () => {
            const result = await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get?b=")
                .expect(200)
            expect(result.body).toEqual({ b: null })
        })
        it("Should return undefined if value not specified", async () => {
            const result = await Supertest((await fixture(AnimalController)).callback())
                .get("/animal/get")
                .expect(200)
            expect(result.body).toEqual({ })
        })
    })
    describe("String parameter binding", () => {

    })
    describe("Date parameter binding", () => {

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
