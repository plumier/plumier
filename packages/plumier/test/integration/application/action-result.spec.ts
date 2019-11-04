import Plumier, { response, route, RestfulApiFacility } from "plumier"
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
            .expect((resp: supertest.Response) => {
                expect(resp.header.location).toBe("/animal/hello")
            })
    })

    it("Should be able to set array value on setHeader", async () => {
        class AnimalController {
            @route.get()
            index() {
                return response
                    .json({ foo: "bar" })
                    .setHeader('set-cookie', ["foo=bar;", "message=hello;"])
            }
        }
        const plumier = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: AnimalController })
            .set({ mode: "production" })
            .initialize()
        await supertest(plumier.callback())
            .get("/animal/index")
            .expect(200)
            .expect((resp: supertest.Response) => {
                const cookie = resp.header["set-cookie"]
                if (process.versions.node.substr(0, 1) === "8") //check if current node.js is version 8
                    expect(cookie).toMatchObject(["foo=bar;,message=hello;"])
                else
                    expect(cookie).toMatchObject(["foo=bar;", "message=hello;"])
            })
    })

    it("Should be able to set cookie", async () => {
        class AnimalController {
            @route.get()
            index() {
                return response.json({ lorem: 1 })
                    .setCookie("theName", "lorem ipsum")
            }
        }
        const plumier = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: AnimalController })
            .set({ mode: "production" })
            .initialize()
        await supertest(plumier.callback())
            .get("/animal/index")
            .expect(200)
            .expect((resp: supertest.Response) => {
                expect(resp.get("Set-Cookie")[0]).toBe("theName=lorem ipsum; path=/; httponly")
            })
    })
})
