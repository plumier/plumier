import { basename } from "path";
import Supertest from "supertest";

import { Plumier, route, WebApiFacility, HttpStatusError } from "../../src";


export class AnimalController {
    error() {
        throw new Error("Error occur")
    }

    statusError(){
        throw new HttpStatusError(400, "Error occur")
    }
}


function fixture() {
    return new Plumier()
        .set(new WebApiFacility())
        .set({ rootPath: __dirname, controllerPath: basename(__filename) })
        .set({ mode: "production" })
}

describe("Error Handling", () => {
    it("Should able to throw general Error from inside action", async () => {
        const koa = await fixture().initialize()
        koa.on("error", () => {})
        await Supertest(koa.callback())
            .get("/animal/error")
            .expect(500, "Internal Server Error")
    })

    it("Should able to throw Http Status Error from inside action", async () => {
        const koa = await fixture().initialize()
        await Supertest(koa.callback())
            .get("/animal/statuserror")
            .expect(400, "Error occur")
    })

    it("Should able to throw general Error from inside global middleware", async () => {

    })

    it("Should able to throw Http Status Error from inside global middleware", async () => {

    })

    it("Should able to throw general Error from inside controller middleware", async () => {

    })

    it("Should able to throw Http Status Error from inside controller middleware", async () => {

    })

    it("Should able to throw general Error from inside action middleware", async () => {

    })

    it("Should able to throw Http Status Error from inside action middleware", async () => {

    })

    it("Should handle 404", async () => {

    })

    it("Should handle server internal error with route information", async () => {

    })
})