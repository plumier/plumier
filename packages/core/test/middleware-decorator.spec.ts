import { middleware, ActionResult } from "@plumjs/core";
import { getDecorators } from '@plumjs/reflect';



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
        @middleware.use(async (ctx, next) => {})
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
            @middleware.use(async (ctx, next) => {})
            method() { }
        }
        const metadata = getDecorators(AnimalController)
        const result = await metadata[0].value.value[0].execute({context: {}, proceed: () => {}})
        expect(metadata[0].value.name).toBe("Middleware")
        expect(result).toBeInstanceOf(ActionResult)
    })
})