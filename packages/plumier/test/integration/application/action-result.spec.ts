import Plumier, { response, route, RestfulApiFacility, bind } from "plumier"
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
                return response.json({})
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

    it("Should be able to remove cookie", async () => {
        class AnimalController {
            @route.get()
            index() {
                return response.json({})
                    .setCookie("theName", "lorem ipsum")
            }
            remove() {
                return response.json({})
                    .setCookie("theName")
            }
        }
        const plumier = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: AnimalController })
            .set({ mode: "production" })
            .initialize()
        const agent = supertest.agent(plumier.callback())
        await agent
            .get("/animal/index")
            .expect(200)
        await agent
            .get("/animal/remove")
            .expect(200)
            .expect((resp: supertest.Response) => {
                expect(resp.get("Set-Cookie")[0]).toContain("expires")
            })
    })

    it("Should be able to bind cookie", async () => {
        class AnimalController {
            @route.get()
            index() {
                return response.json({})
                    .setCookie("theName", "lorem ipsum")
            }
            check(@bind.cookie("theName") cookie: string) {
                return response.json({ cookie })
            }
        }
        const plumier = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: AnimalController })
            .set({ mode: "production" })
            .initialize()
        const agent = supertest.agent(plumier.callback())
        await agent
            .get("/animal/index")
            .expect(200)
        await agent
            .get("/animal/check")
            .expect(200, { cookie: "lorem ipsum" })
    })
})
