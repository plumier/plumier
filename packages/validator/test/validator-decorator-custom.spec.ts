import { convert, val, validatorVisitor } from "../src"
import reflect from "@plumier/reflect";

const option = { visitors: [validatorVisitor] }

describe("Validator Decorator Tests", () => {
    test("after", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.after({ message: "Lorem ipsum dolor" })
                public property: Date
            ) { }
        }
        const result = convert({ property: "2017-2-2" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("after()", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.after({ message: "Lorem ipsum dolor", date: "2018-2-2" })
                public property: Date
            ) { }
        }
        const result = convert({ property: "2017-2-2" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("alpha", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.alpha({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("alphanumeric", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.alphanumeric({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-()234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("ascii", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.ascii({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "∂®abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("base64", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.base64({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("before", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.before({ message: "Lorem ipsum dolor", date: "2018-2-2" })
                public property: Date
            ) { }
        }
        const result = convert({ property: new Date("2019-2-2") }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("before()", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.before({ message: "Lorem ipsum dolor" })
                public property: Date
            ) { }
        }
        const result = convert({ property: new Date("3025-2-2") }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("byteLength", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.byteLength({ message: "Lorem ipsum dolor", max: 5 })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("creditCard", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.creditCard({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("currency", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.currency({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("dataURI", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.dataURI({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("decimal", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.decimal({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("divisibleBy", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.divisibleBy({ message: "Lorem ipsum dolor", num: 4 })
                public property: string
            ) { }
        }
        const result = convert({ property: "25" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("email", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.email({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("fQDN", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.fqdn({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("float", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.float({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("fullWidth", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.fullWidth({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("halfWidth", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.halfWidth({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "あいうえお" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("hash", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.hash({ message: "Lorem ipsum dolor", algorithm: "md5" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("hexColor", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.hexColor({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("hexadecimal", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.hexadecimal({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("iP", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.ip({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("iSBN", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.isbn({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("iSIN", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.isin({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("iSO31661Alpha2", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.iso31661Alpha2({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("iSO8601", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.iso8601({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("iSRC", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.isrc({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("iSSN", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.issn({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("int", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.int({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("jSON", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.json({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("latLong", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.latLong({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("length", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.length({ message: "Lorem ipsum dolor", max: 10 })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234fds" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("lowercase", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.lowerCase({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "DSsafdsa" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("mACAddress", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.macAddress({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "01:02:03:04:05" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("matches", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.matches({ message: "Lorem ipsum dolor", pattern: "^[a-z0-9 ]+$" })
                public property: string
            ) { }
        }
        const result = convert({ property: "the;hero" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("mD5", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.md5({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("mimeType", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.mimeType({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("mobilePhone", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.mobilePhone({ message: "Lorem ipsum dolor", locale: "id-ID" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("mongoId", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.mongoId({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("multibyte", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.multibyte({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("numeric", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.numeric({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("port", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.port({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("postalCode", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.postalCode({ message: "Lorem ipsum dolor", locale: "ID" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("slug", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.slug({message: "Lorem ipsum"})
                public property: string
            ) { }
        }
        const result = convert({ property: "-not-slug" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum"] }])
    })

    test("surrogatePair", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.surrogatePair({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("uRL", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.url({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("uUID", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.UUID({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("uppercase", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.uppercase({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("variableWidth", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.variableWidth({ message: "Lorem ipsum dolor" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })

    test("whitelisted", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.whiteListed({ message: "Lorem ipsum dolor", chars: 'abcdefghijklmnopqrstuvwxyz-' })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123.234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Lorem ipsum dolor"] }])
    })
})