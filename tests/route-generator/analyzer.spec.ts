import { consoleLog, RouteAnalyzerFunction, RouteInfo } from "@plumier/core"
import Plumier, { domain, RestfulApiFacility, route } from "plumier"
import reflect from "tinspector"

describe("Route Analyzer", () => {
    it("Should identify missing backing parameter", async () => {
        @domain()
        class Domain {
            constructor(public name: string) { }
        }
        class AnimalController {
            @route.get(":c")
            method(@reflect.array(Domain) a: Domain[], b: number) { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should identify missing backing parameter on root decorator", async () => {
        @route.root("/beast/:type")
        class AnimalController {
            @route.get(":a")
            method(a: number, b: number) { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should identify missing type information for data binding", async () => {
        class AnimalController {
            method(a: number) { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls).toMatchSnapshot()//("PLUM1001")
        consoleLog.clearMock()
    })

    it("Should not identify missing type information for data binding if method has no parameter", async () => {
        class AnimalController {
            method() { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls.length).toBe(4)
        consoleLog.clearMock()
    })

    it("Should identify duplicate route", async () => {
        @route.root("/beast")
        class AnimalController {
            @route.get()
            method(a: number) { }
        }
        class BeastController {
            @route.get()
            method(a: number) { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController, BeastController] })
            .initialize()
        expect((console.log as any).mock.calls).toMatchSnapshot()//.toContain("PLUM1003")
        consoleLog.clearMock()
    })

    it("Should identify if model doesn't have type information for parameter binding", async () => {
        class AnimalModel {
            constructor(
                public id: number,
                public name: string
            ) { }
        }
        class AnimalController {
            @route.post()
            method(a: AnimalModel) { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls).toMatchSnapshot()//.toContain("PLUM1005")
        consoleLog.clearMock()
    })

    it("Should identify if model doesn't have type information for parameter binding recursive", async () => {
        class TagModel {
            constructor(
                public id: number,
                public name: string
            ) { }
        }
        @domain()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string,
                public tag: TagModel
            ) { }
        }
        class AnimalController {
            @route.post()
            method(a: AnimalModel) { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls).toMatchSnapshot()//.toContain("PLUM1005")
        consoleLog.clearMock()
    })

    it("Should identify if array doesn't have type information for parameter binding", async () => {
        @domain()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string
            ) { }
        }
        class AnimalController {
            @route.post()
            method(a: AnimalModel[]) { }
        }
        consoleLog.startMock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls).toMatchSnapshot()//.toContain("PLUM1006")
        consoleLog.clearMock()
    })

    it("Should be able to extends the route analyzer", async () => {
        class AnimalController {
            @route.get()
            method() { }
        }
        consoleLog.startMock()
        const analyzer: RouteAnalyzerFunction = (route: RouteInfo, allRoutes: RouteInfo[]) => ({ type: "error", message: "PLUM1005: Just an error" })
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ analyzers: [analyzer] })
            .set({ controller: [AnimalController] })
            .initialize()
        expect((console.log as any).mock.calls).toMatchSnapshot()//.toContain("PLUM1005: Just an error")
        consoleLog.clearMock()
    })
})
