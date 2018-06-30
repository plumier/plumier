import { getDecorators } from "../../src/libs/reflect";
import { route } from '../../src';


describe("Route Decorator", () => {
    it("Should decorate GET with override", () => {
        class AnimalController {
            @route.get("/animal")
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        expect(metadata[0].value).toEqual({ name: "Route", method: "get", url: "/animal" })
    })

    it("Should decorate GET without override", () => {
        class AnimalController {
            @route.get()
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        expect(metadata[0].value).toEqual({ name: "Route", method: "get" })
    })

    it("Should decorate POST with override", () => {
        class AnimalController {
            @route.post("/animal")
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        expect(metadata[0].value).toEqual({ name: "Route", method: "post", url: "/animal" })
    })

    it("Should decorate POST without override", () => {
        class AnimalController {
            @route.post()
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        expect(metadata[0].value).toEqual({ name: "Route", method: "post" })
    })

    it("Should decorate PUT with override", () => {
        class AnimalController {
            @route.put("/animal")
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        expect(metadata[0].value).toEqual({ name: "Route", method: "put", url: "/animal" })
    })

    it("Should decorate PUT without override", () => {
        class AnimalController {
            @route.put()
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        expect(metadata[0].value).toEqual({ name: "Route", method: "put" })
    })

    it("Should decorate DELETE with override", () => {
        class AnimalController {
            @route.delete("/animal")
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        expect(metadata[0].value).toEqual({ name: "Route", method: "delete", url: "/animal" })
    })

    it("Should decorate DELETE without override", () => {
        class AnimalController {
            @route.delete()
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        expect(metadata[0].value).toEqual({ name: "Route", method: "delete" })
    })

    it("Should decorate ignore", () => {
        class AnimalController {
            @route.ignore()
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        expect(metadata[0].value).toEqual({ name: "Ignore" })
    })

    it("Should decorate root", () => {
        @route.root("/animal")
        class AnimalController {
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        expect(metadata[0].value).toEqual({ name: "Root", url: "/animal" })
    })
})
