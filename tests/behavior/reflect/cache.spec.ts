import { decorateClass, reflect } from "@plumier/reflect"



describe("Cache Function", () => {

    it("Should cache call", () => {
        @decorateClass({ name: "MyClass" })
        class MyClass {
            method(par: string) { }
        }
        const meta1 = reflect(MyClass)
        const meta2 = reflect(MyClass)
        expect(meta1 == meta2).toBe(true)
    })

    it("Should differentiate class with scope", () => {
        const first = (() => {
            @decorateClass({ name: "first" })
            class MyClass {
                method(par: string) { }
            }
            return MyClass
        })()

        const second = (() => {
            @decorateClass({ name: "second" })
            class MyClass {
                method(par: string) { }
            }
            return MyClass
        })()

        expect(second === first).toBe(false)
        const firstMeta = reflect(first)
        const secondMeta = reflect(second)
        expect(firstMeta == secondMeta).toBe(false)
        expect(firstMeta).toMatchSnapshot()
        expect(secondMeta).toMatchSnapshot()
    })

    it("Should able to modify decorator if not use cache", () => {
        class MyClass {
            method(par: string) { }
        }
        const meta1 = reflect(MyClass)
        expect(meta1).toMatchSnapshot()
        Reflect.decorate([decorateClass({ lorem: "ipsum" })], MyClass)
        const meta2 = reflect(MyClass, { flushCache: true })
        expect(meta2).toMatchSnapshot()
    })

    it("Should able to clear cache to specific type", () => {
        class MyClass {
            method(par: string) { }
        }
        const meta1 = reflect(MyClass)
        reflect.flush(MyClass)
        expect(meta1).toMatchSnapshot()
        Reflect.decorate([decorateClass({ lorem: "ipsum" })], MyClass)
        const meta2 = reflect(MyClass)
        expect(meta2).toMatchSnapshot()
    })

    it("Should able to clear cache all cache", () => {
        class MyClass {
            method(par: string) { }
        }
        class MyOther { }
        reflect(MyClass)
        reflect(MyOther)
        reflect.flush()
        Reflect.decorate([decorateClass({ lorem: "ipsum" })], MyClass)
        Reflect.decorate([decorateClass({ lorem: "ipsum" })], MyOther)
        const meta1 = reflect(MyClass)
        const meta2 = reflect(MyOther)
        expect(meta1).toMatchSnapshot()
        expect(meta2).toMatchSnapshot()
    })
})