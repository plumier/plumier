import "@plumier/testing"

import { RouteAnalyzerFunction, RouteMetadata } from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import { cleanupConsole } from "@plumier/testing"
import reflect from "@plumier/reflect"
import Plumier, { domain, RestfulApiFacility, route } from "plumier"

describe("Route Analyzer", () => {
    it("Should identify missing backing parameter", async () => {
        @domain()
        class Domain {
            constructor(public name: string) { }
        }
        class AnimalController {
            @route.get(":c")
            method(@reflect.type([Domain]) a: Domain[], b: number) { }
        }
        const mock = console.mock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        console.mockClear()
    })

    it("Should identify missing backing parameter on root decorator", async () => {
        @route.root("/beast/:type")
        class AnimalController {
            @route.get(":a")
            method(a: number, b: number) { }
        }
        const mock = console.mock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        console.mockClear()
    })

    it("Should identify missing type information for data binding", async () => {
        class AnimalController {
            method(a: number) { }
        }
        const mock = console.mock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()//("PLUM1001")
        console.mockClear()
    })

    it("Should not identify missing type information for data binding if method has no parameter", async () => {
        class AnimalController {
            method() { }
        }
        const mock = console.mock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls).length).toBe(4)
        console.mockClear()
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
        const mock = console.mock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController, BeastController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()//.toContain("PLUM1003")
        console.mockClear()
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
        const mock = console.mock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()//.toContain("PLUM1005")
        console.mockClear()
    })

    it("Should identify if model property doesn't have type information for parameter binding", async () => {
        @domain()
        class AnimalModel {
            constructor(
                public id: number,
                public name: any
            ) { }
        }
        class AnimalController {
            @route.post()
            method(a: AnimalModel) { }
        }
        const mock = console.mock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()//.toContain("PLUM1005")
        console.mockClear()
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
        const mock = console.mock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()//.toContain("PLUM1005")
        console.mockClear()
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
        const mock = console.mock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()//.toContain("PLUM1006")
        console.mockClear()
    })

    it("Should identify if array property doesn't have type information for parameter binding", async () => {
        @domain()
        class AnimalModel {
            constructor(
                public id: number,
                public name: number[]
            ) { }
        }
        class AnimalController {
            @route.post()
            method(a: AnimalModel) { }
        }
        const mock = console.mock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()//.toContain("PLUM1005")
        console.mockClear()
    })

    it("Should not error when analyzing cross reference model", async () => {
        class Client {
            @reflect.noop()
            id: number
            @reflect.type(x => Animal)
            animals: any
        }
        class Animal {
            @reflect.noop()
            id: number
            @reflect.type(x => Client)
            name: any
        }
        class AnimalController {
            @route.post()
            method(a: Animal) { }
        }
        const mock = console.mock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [AnimalController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        console.mockClear()
    })

    it("Should be able to extends the route analyzer", async () => {
        class AnimalController {
            @route.get()
            method() { }
        }
        const mock = console.mock()
        const analyzer: RouteAnalyzerFunction = (route: RouteMetadata, allRoutes: RouteMetadata[]) => ([{ type: "error", message: "PLUM1005: Just an error" }])
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ analyzers: [analyzer] })
            .set({ controller: [AnimalController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()//.toContain("PLUM1005: Just an error")
        console.mockClear()
    })
})

describe("Analyzer Report", () => {
    it("Should trim long controller report", async () => {
        class AveryVeryVeryVeryVeryLongNamedController {
            @route.get()
            aVerryVerryVerryVerryVerryLongNamedMethod(very: string, long: string, list: string, of: string, method: string, parameters: string) { }
            @route.get()
            anotherVerryVerryVerryVerryVerryLongNamedMethod(very: string, long: string, list: string, of: string, method: string, parameters: string) { }
        }
        const mock = console.mock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set(new JwtAuthFacility({ secret: "lorem" }))
            .set({ controller: [AveryVeryVeryVeryVeryLongNamedController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        console.mockClear()
    })
    it("Should only trim parameters if still long", async () => {
        class UsersController {
            @route.get("")
            get(very: string, long: string, list: string, of: string, method: string, parameters: string) { }
            @route.post("")
            save(very: string, long: string, list: string, of: string, method: string, parameters: string) { }
        }
        const mock = console.mock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [UsersController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        console.mockClear()
    })
    it("Should not trim if short enough to fit", async () => {
        class UsersController {
            @route.get("")
            get(very: string, long: string) { }
            @route.post("")
            save(very: string, long: string) { }
        }
        const mock = console.mock()
        const app = await new Plumier()
            .set(new RestfulApiFacility())
            .set({ controller: [UsersController] })
            .initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        console.mockClear()
    })
})
