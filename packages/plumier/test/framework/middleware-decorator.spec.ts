import { middleware, ActionResult } from "../../src";
import { getDecorators } from '../../src/libs/reflect';



describe("Middleware Decorator", () => {
    it("Should decorate class middleware", async () => {
        @middleware.use({ execute: async () => new ActionResult() })
        class AnimalController {
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        const result = await metadata[0].value.value[0].execute()
        expect(metadata[0].value.name).toBe("Middleware")
        expect(result).toBeInstanceOf(ActionResult)
    })

    it("Should decorate method middleware", async () => {
        class AnimalController {
            @middleware.use({ execute: async () => new ActionResult() })
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        const result = await metadata[0].value.value[0].execute()
        expect(metadata[0].value.name).toBe("Middleware")
        expect(result).toBeInstanceOf(ActionResult)
    })

    it("Should decorate class middleware with Koa middleware", async () => {
        @middleware.use((ctx, next) => next())
        class AnimalController {
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        const result = await metadata[0].value.value[0].execute({context: {}, proceed: () => {}})
        expect(metadata[0].value.name).toBe("Middleware")
        expect(result).toBeInstanceOf(ActionResult)
    })

    it("Should decorate method middleware with Koa middleware", async () => {
        class AnimalController {
            @middleware.use((ctx, next) => next())
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        const result = await metadata[0].value.value[0].execute({context: {}, proceed: () => {}})
        expect(metadata[0].value.name).toBe("Middleware")
        expect(result).toBeInstanceOf(ActionResult)
    })
})