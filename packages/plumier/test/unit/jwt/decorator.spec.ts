import { authorize } from "@plumier/core"
import { reflect } from "tinspector"


describe("JwtAuth Decorator", () => {
    it("Should able to decorate controller", () => {
        @authorize.role("admin")
        class AnimalController {
            method() { }
        }

        const meta = reflect(AnimalController)
        expect(meta.decorators).toMatchObject([{ type: 'plumier-meta:authorize', tag: 'admin' }])
    })

    it("Should able to decorate method", () => {
        class AnimalController {
            @authorize.role("admin")
            method(@authorize.role() test: number) { }
        }

        const meta = reflect(AnimalController)
        expect(meta.methods[0].decorators).toMatchObject([{ type: 'plumier-meta:authorize', tag: 'admin' }])
    })

    it("Should able to decorate controller", () => {
        @authorize.public()
        class AnimalController {
            method() { }
        }

        const meta = reflect(AnimalController)
        expect(meta.decorators).toMatchObject([{ type: 'plumier-meta:authorize', tag: 'Public' }])
    })

    it("Should able to decorate method", () => {
        class AnimalController {
            @authorize.public()
            method() { }
        }

        const meta = reflect(AnimalController)
        expect(meta.methods[0].decorators).toMatchObject([{ type: 'plumier-meta:authorize', tag: 'Public' }])
    })

    it("Should able to decorate parameter", () => {
        class AnimalController {
            method(@authorize.role("admin") data: number) { }
        }
        const meta = reflect(AnimalController)
        expect(meta.methods[0].parameters[0].decorators).toMatchObject([
            { type: 'plumier-meta:authorize', tag: 'admin' },
            { validator: "internal:optional", type: "ValidatorDecorator" }])
    })

    it("Should throw error if @authorize.public() applied on parameter", () => {
        expect(() => {
            class AnimalController {
                method(@authorize.public() data: number) { }
            }
        }).toThrow("PLUM1008: @authorize.public() can not be applied to parameter")
    })
})