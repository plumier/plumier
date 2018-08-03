
import { authorize } from "@plumjs/jwt"
import { reflect } from '@plumjs/reflect';
import { inspect } from 'util';

describe("JwtAuth Decorator", () => {
    it("Should able to decorate controller", () => {
        @authorize.role("admin")
        class AnimalController {
            method() { }
        }

        const meta = reflect(AnimalController)
        expect(meta.decorators).toEqual([ { type: 'authorize:role', value: [ 'admin' ] } ])
    })

    it("Should able to decorate method", () => {
        class AnimalController {
            @authorize.role("admin")
            method() { }
        }

        const meta = reflect(AnimalController)
        expect(meta.methods[0].decorators).toEqual([ { type: 'authorize:role', value: [ 'admin' ] } ])
    })

    it("Should able to decorate controller", () => {
        @authorize.public()
        class AnimalController {
            method() { }
        }

        const meta = reflect(AnimalController)
        expect(meta.decorators).toEqual([ { type: 'authorize:public', value: [  ] } ])
    })

    it("Should able to decorate method", () => {
        class AnimalController {
            @authorize.public()
            method() { }
        }

        const meta = reflect(AnimalController)
        expect(meta.methods[0].decorators).toEqual([ { type: 'authorize:public', value: [  ] } ])
    })
})