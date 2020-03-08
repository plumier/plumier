import { ActionResult, bind } from "@plumier/core"
import Plumier, { ForceHttpsMiddleware, WebApiFacility } from "plumier"
import Supertest from "supertest"

describe("Proxy Headers", () => {

    class AnimalController {
        index(@bind.ctx("protocol") protocol: string) {
            return { protocol }
        }
    }

    function fixture(trustProxyHeader: boolean) {
        return new Plumier()
            .set(new WebApiFacility({ trustProxyHeader, controller: AnimalController }))
            .set({ mode: "production" })
    }

    it("Should accept protocol when trusted", async () => {
        const app = await fixture(true)
            .initialize()
        const { body } = await Supertest(app.callback())
            .get("/animal/index")
            .set("x-forwarded-proto", "https")
            .expect(200)
        expect(body).toMatchSnapshot()
    })

    it("Should not accept protocol by default", async () => {
        const app = await fixture(false)
            .initialize()
        const { body } = await Supertest(app.callback())
            .get("/animal/index")
            .set("x-forwarded-proto", "https")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
})

describe("Force HTTPS", () => {

    class AnimalController {
        index(@bind.ctx("protocol") protocol: string) {
            return { protocol }
        }
    }

    function fixture(forceHttps?: boolean) {
        return new Plumier()
            .set(new WebApiFacility({ forceHttps, controller: AnimalController }))
            .set({ mode: "production" })
    }

    it("Should redirect to https when enabled", async () => {
        const app = await fixture(true)
            .initialize()
        const resp = await Supertest(app.callback())
            .get("/animal/index")
            .expect(302)
        expect(resp.header["location"]).toMatchSnapshot()
    })

    it("Should not redirect to https when set to false", async () => {
        const app = await fixture(false)
            .initialize()
        await Supertest(app.callback())
            .get("/animal/index")
            .expect(200)
    })

    it("Should redirect to https when enabled using env variable", async () => {
        process.env.PLUM_FORCE_HTTPS = "true"
        const app = await fixture()
            .initialize()
        const resp = await Supertest(app.callback())
            .get("/animal/index")
            .expect(302)
        expect(resp.header["location"]).toMatchSnapshot()
    })

    it("Should not redirect to https when env variable set to false", async () => {
        process.env.PLUM_FORCE_HTTPS = "false"
        const app = await fixture()
            .initialize()
        await Supertest(app.callback())
            .get("/animal/index")
            .expect(200)
    })

    it("Should priorities code vs configuration", async () => {
        process.env.PLUM_FORCE_HTTPS = "false"
        const app = await fixture(true)
            .initialize()
        const resp = await Supertest(app.callback())
            .get("/animal/index")
            .expect(302)
        expect(resp.header["location"]).toMatchSnapshot()
    })

    it("Should priorities code vs configuration when provided falsy", async () => {
        process.env.PLUM_FORCE_HTTPS = "true"
        const app = await fixture(false)
            .initialize()
        const resp = await Supertest(app.callback())
            .get("/animal/index")
            .expect(200)
    })

    it("Should not redirect when already requested https", async () => {
        process.env.NODE_ENV = "production"
        const mdw = new ForceHttpsMiddleware()
        const result = await mdw.execute({
            proceed: async () => new ActionResult("not processed"),
            ctx: {
                request: {
                    protocol: "https", 
                    hostName: "localhost",
                    originalUrl: "/animals/index"
                } as any
            } as any
        })
        delete process.env.NODE_ENV
        expect(result).toMatchSnapshot()
    })
})
