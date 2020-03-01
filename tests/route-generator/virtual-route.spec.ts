
import Plumier, { route, CustomMiddleware, Invocation, ActionResult } from "plumier"
import { Context } from "koa"
import { consoleLog, DefaultFacility, PlumierApplication, DefaultDependencyResolver } from '@plumier/core'

describe("Virtual Route", () => {

    it("Should able to print virtual route", async () => {
        @route.virtual({ method: "get", url: "/route/route", access: "Public" })
        class MyMiddleware implements CustomMiddleware {
            execute(invocation: Readonly<Invocation<Context>>): Promise<ActionResult> {
                return invocation.proceed()
            }
        }
        const mock = consoleLog.startMock()
        await new Plumier()
            .use(new MyMiddleware())
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should able to assigned multiple virtual route", async () => {
        @route.virtual({ method: "get", url: "/route/route", access: "Public" })
        @route.virtual({ method: "get", url: "/route/second-route", access: "Public" })
        class MyMiddleware implements CustomMiddleware {
            execute(invocation: Readonly<Invocation<Context>>): Promise<ActionResult> {
                return invocation.proceed()
            }
        }
        const mock = consoleLog.startMock()
        await new Plumier()
            .use(new MyMiddleware())
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should able print route that middleware registered by Facility on setup", async () => {
        @route.virtual({ method: "get", url: "/route/route", access: "Public" })
        class MyMiddleware implements CustomMiddleware {
            execute(invocation: Readonly<Invocation<Context>>): Promise<ActionResult> {
                return invocation.proceed()
            }
        }
        class MyFacility extends DefaultFacility {
            setup(app: Readonly<PlumierApplication>) {
                app.use(new MyMiddleware())
            }
        }
        const mock = consoleLog.startMock()
        await new Plumier()
            .set(new MyFacility())
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should able print route that middleware registered by Facility on initialize", async () => {
        @route.virtual({ method: "get", url: "/route/route", access: "Public" })
        class MyMiddleware implements CustomMiddleware {
            execute(invocation: Readonly<Invocation<Context>>): Promise<ActionResult> {
                return invocation.proceed()
            }
        }
        class MyFacility extends DefaultFacility {
            async initialize(app: Readonly<PlumierApplication>) {
                app.use(new MyMiddleware())
            }
        }
        const mock = consoleLog.startMock()
        await new Plumier()
            .set(new MyFacility())
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should able print route registered using string (DI)", async () => {
        const di = new DefaultDependencyResolver()
        const name = "myMiddleware"
        @di.register(name)
        @route.virtual({ method: "get", url: "/route/route", access: "Public" })
        class MyMiddleware implements CustomMiddleware {
            execute(invocation: Readonly<Invocation<Context>>): Promise<ActionResult> {
                return invocation.proceed()
            }
        }
        const mock = consoleLog.startMock()
        await new Plumier()
            .set({ dependencyResolver: di })
            .use(name)
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should able print route registered using symbol (DI)", async () => {
        const di = new DefaultDependencyResolver()
        const name = Symbol("myMiddleware")
        @di.register(name)
        @route.virtual({ method: "get", url: "/route/route", access: "Public" })
        class MyMiddleware implements CustomMiddleware {
            execute(invocation: Readonly<Invocation<Context>>): Promise<ActionResult> {
                return invocation.proceed()
            }
        }
        const mock = consoleLog.startMock()
        await new Plumier()
            .set({ dependencyResolver: di })
            .use(name)
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })


    it("Should not included middleware function", async () => {
        const mock = consoleLog.startMock()
        await new Plumier()
            .use(x => x.proceed())
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should not print anything if no virtual route found", async () => {
        const mock = consoleLog.startMock()
        await new Plumier()
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })
})