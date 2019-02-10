import { bind, domain, route } from "@plumier/core";
import { analyzeRoutes, printAnalysis, transformController } from "../../../src/router";
import { consoleLog } from '@plumier/core';
import reflect from "tinspector"

describe("Analyzer", () => {
    it("Should analyze missing backing parameter", () => {
        class AnimalController {
            @route.get("/animal/get/:id/:name")
            getAnimal(a: string, b: string) { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(1)
        expect(analysis[0].issues[0].message).toContain("PLUM1000")
        expect(analysis[0].issues[0].message).toContain("id, name")
        expect(analysis[0].issues[0].type).toBe("error")
    })

    it("Should analyze missing backing parameter in root route", () => {

        @route.root("/root/:type/animal")
        class AnimalController {
            @route.get(":id/:name")
            getAnimal(id: string, name: string) { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(1)
        expect(analysis[0].issues[0].message).toContain("PLUM1000")
        expect(analysis[0].issues[0].message).toContain("type")
        expect(analysis[0].issues[0].type).toBe("error")
    })

    it("Should ignore case on backing parameter route", () => {
        @route.root("/root/:type/animal")
        class AnimalController {
            @route.get(":name")
            getAnimal(TYPE: string, NAME: string) { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(0)
    })

    it("Should identify missing design type information", () => {
        class AnimalController {
            getAnimal(a: string, b: string) { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(1)
        expect(analysis[0].issues[0].message).toContain("PLUM1001")
        expect(analysis[0].issues[0].type).toBe("warning")
    })

    it("Should not identify missing design type information if not contains parameter", () => {
        class AnimalController {
            getAnimal() { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(0)
    })

    it("Should identify duplicate route", () => {

        class AnimalController {
            @route.get("get")
            getAnimal(a: string, b: string) { }
        }
        @route.root("/animal")
        class BeastController {
            @route.get("get")
            getBeast(a: string, b: string) { }
        }

        const routeInfo = transformController(AnimalController)
            .concat(transformController(BeastController))
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(1)
        expect(analysis[0].issues[0].message).toContain("PLUM1003")
        expect(analysis[0].issues[0].type).toBe("error")
        expect(analysis[1].issues.length).toBe(1)
        expect(analysis[1].issues[0].message).toContain("PLUM1003")
        expect(analysis[1].issues[0].type).toBe("error")
    })

    it("Should not identify as duplicate if routes has different http method", () => {

        class AnimalController {
            @route.post("get")
            getAnimal(a: string, b: string) { }
        }
        @route.root("/animal")
        class BeastController {
            @route.get("get")
            getBeast(a: string, b: string) { }
        }

        const routeInfo = transformController(AnimalController)
            .concat(transformController(BeastController))
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(0)
    })

    it("Should print issue properly", () => {
        @route.root("/root/:type/animal")
        class AnimalController {
            @route.get(":id/:name")
            getAnimal(id: string, name: string) { }
        }

        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        consoleLog.startMock()
        printAnalysis(analysis)
        expect(console.log).toBeCalled()
        consoleLog.clearMock()
    })

    it("Should print info properly", () => {
        class AnimalController {
            @route.get(":id/:name")
            getAnimal(id: string, name: string) { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        consoleLog.startMock()
        printAnalysis(analysis)
        expect(console.log).toBeCalled()
        consoleLog.clearMock()
    })

    it("Model with correct configuration should be pass", () => {
        @domain()
        class AnimalModel {
            constructor(public id: number) { }
        }
        class AnimalController {
            @route.post()
            getAnimal(id: number, model: AnimalModel, @reflect.array(AnimalModel) models: AnimalModel[]) { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(0)
    })

    it("Should identify if model doesn't contains type information", () => {
        class AnimalModel {
            constructor(public id: number) { }
        }
        class AnimalController {
            @route.post()
            getAnimal(id: number, model: AnimalModel) { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(1)
        expect(analysis[0].issues[0].message).toContain("PLUM1005")
    })

    it("Should identify if model doesn't contains type information recursive", () => {
        class TagModel {
            constructor(
                public id: number
            ) { }
        }
        @domain()
        class AnimalModel {
            constructor(
                public id: number,
                public tag: TagModel
            ) { }
        }
        class AnimalController {
            @route.post()
            getAnimal(id: number, model: AnimalModel) { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(1)
        expect(analysis[0].issues[0].message).toContain("PLUM1005")
    })

    it("Should identify if model doesn't contains type information only once in recursive mode", () => {
        class TagModel {
            constructor(
                public id: number,
                public childTag: TagModel
            ) { }
        }
        @domain()
        class AnimalModel {
            constructor(
                public id: number,
                public tag: TagModel,
                public siblingTag: TagModel
            ) { }
        }
        class AnimalController {
            @route.post()
            getAnimal(id: number, model: AnimalModel) { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(1)
        expect(analysis[0].issues[0].message).toContain("PLUM1005")
    })

    it("Should identify if array doesn't contains type information", () => {
        @domain()
        class AnimalModel {
            constructor(public id: number) { }
        }
        class AnimalController {
            @route.post()
            getAnimal(id: number, models: AnimalModel[], otherModels: number[]) { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(1)
        expect(analysis[0].issues[0].message).toContain("PLUM1006")
        expect(analysis[0].issues[0].message).toContain("AnimalController.getAnimal.models, AnimalController.getAnimal.otherModels")
    })

    it("Should identify if array doesn't contains type information inside model", () => {
        @domain()
        class TagModel {
            constructor(public name: string) { }
        }
        @domain()
        class AnimalModel {
            constructor(public id: number, tags: TagModel[]) { }
        }
        class AnimalController {
            @route.post()
            getAnimal(id: number, model: AnimalModel) { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(1)
        expect(analysis[0].issues[0].message).toContain("PLUM1006")
        expect(analysis[0].issues[0].message).toContain("(AnimalModel.tags)")
    })

    it("Should identify if array doesn't contains type information inside model recursive", () => {
        @domain()
        class TagModel {
            constructor(public name: string) { }
        }
        @domain()
        class AnimalModel {
            constructor(public id: number, tags: TagModel[]) { }
        }
        class AnimalController {
            @route.post()
            getAnimal(id: number, @reflect.array(AnimalModel) models: AnimalModel[]) { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(1)
        expect(analysis[0].issues[0].message).toContain("PLUM1006")
        expect(analysis[0].issues[0].message).toContain("(AnimalModel.tags)")
    })

    it("Should not report missing array type on type already reported", () => {
        @domain()
        class TagModel {
            constructor(public name: string) { }
        }
        @domain()
        class AnimalModel {
            constructor(public id: number, tags: TagModel[]) { }
        }
        class AnimalController {
            @route.post()
            getAnimal(id: number, @reflect.array(AnimalModel) models: AnimalModel[], @reflect.array(AnimalModel) otherModels: AnimalModel[]) { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(1)
        expect(analysis[0].issues[0].message).toContain("PLUM1006")
        expect(analysis[0].issues[0].message).toContain("(AnimalModel.tags)")
    })
})