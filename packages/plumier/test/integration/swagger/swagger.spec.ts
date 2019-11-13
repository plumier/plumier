import Plumier, { Class, Configuration, WebApiFacility } from "plumier"
import { OpenApiFacility } from "@plumier/swagger"
import supertest = require('supertest')

export function appStub(controller: Class | Class[] | string) {
    return new Plumier()
        .set(new WebApiFacility({ controller }))
        .set(new OpenApiFacility())
        .initialize()
}

describe("Swagger", () => {
    describe("Paths", () => {
        it("Should provide path on controller convention", async () => {
            class AnimalController {
                index() { }
            }
            const app = await appStub(AnimalController)
            const { body } = await supertest(app.callback())
                .get("/swagger.json")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })

})