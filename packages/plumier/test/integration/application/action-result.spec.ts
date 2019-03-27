import Plumier, { response, route } from "../../../src"
import {RestfulApiFacility} from "plumier/src/facility"
import supertest from "supertest"


describe("Redirect Action Result", () => {
    it("Should be able to redirect result", async () => {
        class AnimalController {
            @route.get()
            index() {
                return response.redirect("/animal/hello")
            }
            @route.get()
            hello() {
                return { message: "Hello" }
            }
        }
        const plumier = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: AnimalController })
            .set({ mode: "production" })
            .initialize()
        await supertest(plumier.callback())
            .get("/animal/index")
            .expect(302)
            .expect((resp:supertest.Response) => {
                expect(resp.header.location).toBe("/animal/hello")
            })
    })
})