import { middleware } from "@plumier/core"
import supertest from "supertest"

import { fixture } from "../helper"


describe("Action Middleware", () => {
    it("Should able to access metadata from action controller", async () => {
        const fn = jest.fn()
        @middleware.use(x => {
            fn(x.metadata)
            return x.proceed()
        })
        class AnimalController {
            get(id: string) { return { id } }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234")
            .expect(200, { id: "1234" })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to get parameter by name", async () => {
        const fn = jest.fn()
        @middleware.use(x => {
            fn(x.metadata.actionParams.get<string>("id"))
            return x.proceed()
        })
        class AnimalController {
            get(id: string) { return { id } }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234")
            .expect(200, { id: "1234" })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should return undefined if provided wrong parameter name", async () => {
        const fn = jest.fn()
        @middleware.use(x => {
            fn(x.metadata.actionParams.get("UserId"))
            return x.proceed()
        })
        class AnimalController {
            get(id: string) { return { id } }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234")
            .expect(200, { id: "1234" })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to get parameter by number", async () => {
        const fn = jest.fn()
        @middleware.use(x => {
            fn(x.metadata.actionParams.get(0))
            return x.proceed()
        })
        class AnimalController {
            get(id: string) { return { id } }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234")
            .expect(200, { id: "1234" })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to get check if has parameter", async () => {
        const fn = jest.fn()
        @middleware.use(x => {
            fn(x.metadata.actionParams.hasName("ID"))
            fn(x.metadata.actionParams.hasName("UserID"))
            return x.proceed()
        })
        class AnimalController {
            get(id: string) { return { id } }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234")
            .expect(200, { id: "1234" })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to get all parameter names", async () => {
        const fn = jest.fn()
        @middleware.use(x => {
            fn(x.metadata.actionParams.names())
            return x.proceed()
        })
        class AnimalController {
            get(id: string, name: string) { return { id, name } }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234&name=mimi")
            .expect(200, { id: "1234", name: "mimi" })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to get all parameter values", async () => {
        const fn = jest.fn()
        @middleware.use(x => {
            fn(x.metadata.actionParams.values())
            return x.proceed()
        })
        class AnimalController {
            get(id: string, name: string) { return { id, name } }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234&name=mimi")
            .expect(200, { id: "1234", name: "mimi" })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able spread invocation object", async () => {
        const fn = jest.fn()
        @middleware.use(({ ctx, metadata, proceed }) => {
            fn(metadata?.controller.name)
            fn(ctx.url)
            return proceed()
        })
        class AnimalController {
            get(id: string) { return { id } }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234")
            .expect(200, { id: "1234" })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to get current metadata info when applied on controller", async () => {
        const fn = jest.fn()
        @middleware.use((invocation) => {
            fn(invocation.metadata.current)
            return invocation.proceed()
        })
        class AnimalController {
            get(id: string) { return { id } }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234")
            .expect(200, { id: "1234" })
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to get current metadata info when applied on method", async () => {
        const fn = jest.fn()
        class AnimalController {
            @middleware.use((invocation) => {
                fn(invocation.metadata.current)
                return invocation.proceed()
            })
            get(id: string) { return { id } }
        }
        const app = await fixture(AnimalController).initialize()
        await supertest(app.callback())
            .get("/animal/get?id=1234")
            .expect(200, { id: "1234" })
        expect(fn.mock.calls).toMatchSnapshot()
    })
})
