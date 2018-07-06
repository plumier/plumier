import { route } from "../../src";
import { analyzeRoutes, transformController, printAnalysis } from "../../src/router";
import { consoleLog } from '../helper';
import { inspect } from 'util';

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

    it("Should identify multiple decorators", () => {
        class AnimalController {
            @route.get("/animal")
            @route.get("/animal/get")
            getAnimal(a: string, b: string) { }
        }
        const routeInfo = transformController(AnimalController)
        const analysis = analyzeRoutes(routeInfo)
        expect(analysis[0].issues.length).toBe(1)
        expect(analysis[0].issues[0].message).toContain("PLUM1002")
        expect(analysis[0].issues[0].type).toBe("error")
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
})