import Plumier, { ActionResult, bind, response, RestfulApiFacility, route } from "plumier"
import supertest from "supertest"

import { fixture } from "../../helper"

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

describe("Action Result", () => {
    it("Should able to return string", async () => {
        class AnimalController {
            method() {
                return "Hello world!"
            }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/method")
            .expect(200, "Hello world!")
    })

    it("Should able to return promise", async () => {
        class AnimalController {
            method() {
                return Promise.resolve("Hello world!")
            }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/method")
            .expect(200, "Hello world!")
    })

    it("Should able using async method", async () => {
        class AnimalController {
            async method() {
                return "Hello world!"
            }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/method")
            .expect(200, "Hello world!")
    })

    it("Should able return action result with specific status code", async () => {
        class AnimalController {
            method() {
                return new ActionResult("Hello world!", 201)
            }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/method")
            .expect(201, "Hello world!")
    })

    it("Should able return action result with specific status code using response helper", async () => {
        class AnimalController {
            method() {
                return response.json({ message: "Hello" })
                    .setStatus(201)
            }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/method")
            .expect(201, { message: "Hello" })
    })

    it("Should able to set header from action result", async () => {
        class AnimalController {
            method() {
                return new ActionResult("Hello world!")
                    .setHeader("x-api-key", "YOUR_SECRETE_API_KEY")
            }
        }
        const app = await fixture(AnimalController).initialize()
        const result = await supertest(app.callback())
            .get("/animal/method")
            .expect(200, "Hello world!")
        expect(result.header["x-api-key"]).toBe("YOUR_SECRETE_API_KEY")
    })

    it("Should return status 200 for default action result status code", async () => {
        class AnimalController {
            method() {
                return new ActionResult("Hello world!")
            }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/method")
            .expect(200, "Hello world!")
    })

    it("Should able return promised action result", async () => {
        class AnimalController {
            method() {
                return Promise.resolve(new ActionResult("Hello world!", 201))
            }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/method")
            .expect(201, "Hello world!")
    })

    it("Should able return action result in async method", async () => {
        class AnimalController {
            async method() {
                return new ActionResult("Hello world!", 201)
            }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/method")
            .expect(201, "Hello world!")
    })

    it("Should expose cookies", () => {
        const result = new ActionResult()
            .setCookie("key", "value", { path: "/", sameSite: "strict" })
            .setCookie("key2", "value2", { path: "/data", sameSite: "lax" })
        expect(result.cookies).toMatchSnapshot()
    })

    it("Should expose headers", () => {
        const result = new ActionResult()
            .setHeader("x-api-key", "lorem ipsum")
            .setHeader("x-redirect", "https://google.com")
        expect(result.headers).toMatchSnapshot()
    })
})

