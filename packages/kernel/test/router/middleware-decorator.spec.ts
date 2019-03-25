import { ActionResult, Invocation, Middleware, middleware } from "@plumier/core"
import { RouteGenerator } from "@plumier/kernel"

class DummyMiddleware implements Middleware {
    constructor(public id: number) {  }
    execute(i: Invocation): Promise<ActionResult> {
        return i.proceed()
    }
}

describe("Middleware Decorator Extraction", () => {
    it("Should extract middleware from class", () => {
        @middleware.use(new DummyMiddleware(1), new DummyMiddleware(2))
        @middleware.use(new DummyMiddleware(3), new DummyMiddleware(4))
        class AnimalController {
            getData() { }
        }

        const route = RouteGenerator.transformController(AnimalController)
        const mdw = <DummyMiddleware[]>middleware.extractDecorators(route[0])
        expect(mdw.map(x => x.id).join("")).toBe("1234")
    })

    it("Should extract middleware from method", () => {
        class AnimalController {
            @middleware.use(new DummyMiddleware(1), new DummyMiddleware(2))
            @middleware.use(new DummyMiddleware(3), new DummyMiddleware(4))
            getData() { }
        }

        const route = RouteGenerator.transformController(AnimalController)
        const mdw = <DummyMiddleware[]>middleware.extractDecorators(route[0])
        expect(mdw.map(x => x.id).join("")).toBe("1234")
    })

    it("Should extract middleware from method and classes", () => {
        @middleware.use(new DummyMiddleware(5), new DummyMiddleware(6))
        @middleware.use(new DummyMiddleware(7), new DummyMiddleware(8))
        class AnimalController {
            @middleware.use(new DummyMiddleware(1), new DummyMiddleware(2))
            @middleware.use(new DummyMiddleware(3), new DummyMiddleware(4))
            getData() { }
        }

        const route = RouteGenerator.transformController(AnimalController)
        const mdw = <DummyMiddleware[]>middleware.extractDecorators(route[0])
        expect(mdw.map(x => x.id).join("")).toBe("12345678")
    })
})