import Plumier, { response, WebApiFacility, route } from "@plumjs/plumier"
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
            .set(new WebApiFacility())
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