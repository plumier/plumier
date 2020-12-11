import { convert, val, validatorVisitor } from "../src"
import reflect from "@plumier/reflect";
import { createValidation } from '../src/validation';

const option = { visitors: [validatorVisitor] }

describe("Validator Decorator Tests", () => {
    test("after", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.after()
                public property: Date
            ) { }
        }
        const result = convert({ property: "2017-2-2" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Date must be greater than today"] }])
    })

    test("after()", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.after({ date: "2018-2-2" })
                public property: Date
            ) { }
        }
        const result = convert({ property: "2017-2-2" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Date must be greater than 2018-2-2"] }])
    })

    test("alpha", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.alpha()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid alpha"] }])
    })

    test("alphanumeric", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.alphanumeric()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-()234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid alpha numeric"] }])
    })

    test("ascii", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.ascii()
                public property: string
            ) { }
        }
        const result = convert({ property: "∂®abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid ascii"] }])
    })

    test("base64", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.base64()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid base 64"] }])
    })

    test("before", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.before({ date: "2018-2-2" })
                public property: Date
            ) { }
        }
        const result = convert({ property: new Date("2019-2-2") }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Date must be less than 2018-2-2"] }])
    })

    test("before()", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.before()
                public property: Date
            ) { }
        }
        const result = convert({ property: new Date("3025-2-2") }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Date must be less than today"] }])
    })

    test("byteLength", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.byteLength({ max: 5 })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid byte length"] }])
    })

    test("creditCard", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.creditCard()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid credit card number"] }])
    })

    test("currency", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.currency()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid currency"] }])
    })

    test("dataURI", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.dataURI()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid data URI"] }])
    })

    test("decimal", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.decimal()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid decimal"] }])
    })

    test("divisibleBy", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.divisibleBy({ num: 4 })
                public property: string
            ) { }
        }
        const result = convert({ property: "25" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Not divisible by 4"] }])
    })

    test("email", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.email()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid email address"] }])
    })

    test("fQDN", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.fqdn()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid FQDN"] }])
    })

    test("float", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.float()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid float number"] }])
    })

    test("fullWidth", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.fullWidth()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid value provided"] }])
    })

    test("halfWidth", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.halfWidth()
                public property: string
            ) { }
        }
        const result = convert({ property: "あいうえお" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid value provided"] }])
    })

    test("hash", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.hash({ algorithm: "md5" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid hash"] }])
    })

    test("hexColor", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.hexColor()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid hex color"] }])
    })

    test("hexadecimal", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.hexadecimal()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid hexadecimal"] }])
    })

    test("iP", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.ip()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid IP address"] }])
    })

    test("iSBN", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.isbn()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid ISBN"] }])
    })

    test("iSIN", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.isin()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid ISIN"] }])
    })

    test("iSO31661Alpha2", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.iso31661Alpha2()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid ISO 31661 Alpha 2"] }])
    })

    test("iSO8601", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.iso8601()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid ISO 8601 date"] }])
    })

    test("iSRC", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.isrc()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid ISRC"] }])
    })

    test("iSSN", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.issn()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid ISSN"] }])
    })

    test("int", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.int()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid integer"] }])
    })

    test("jSON", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.json()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid JSON"] }])
    })

    test("latLong", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.latLong()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid lat long"] }])
    })

    test("length", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.length({ max: 10 })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234fds" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid length"] }])
    })

    test("lowercase", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.lowerCase()
                public property: string
            ) { }
        }
        const result = convert({ property: "DSsafdsa" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid lower case"] }])
    })

    test("mACAddress", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.macAddress()
                public property: string
            ) { }
        }
        const result = convert({ property: "01:02:03:04:05" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid MAC address"] }])
    })

    test("matches", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.matches({ pattern: "^[a-z0-9 ]+$" })
                public property: string
            ) { }
        }
        const result = convert({ property: "the;hero" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid string"] }])
    })

    test("mD5", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.md5()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid MD5 hash"] }])
    })

    test("mimeType", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.mimeType()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid mime type"] }])
    })

    test("mobilePhone", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.mobilePhone({ locale: "id-ID" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid mobile phone"] }])
    })

    test("mobilePhone", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.mobilePhone()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid mobile phone"] }])
    })

    test("mongoId", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.mongoId()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid MongoDb id"] }])
    })

    test("multibyte", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.multibyte()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid multi byte"] }])
    })

    test("numeric", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.numeric()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid numeric"] }])
    })

    test("port", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.port()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid port"] }])
    })

    test("postalCode", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.postalCode({ locale: "ID" })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid postal code"] }])
    })

    test("postalCode", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.postalCode()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid postal code"] }])
    })

    test("slug", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.slug()
                public property: string
            ) { }
        }
        const result = convert({ property: "-not-slug" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid slug"] }])
    })

    test("surrogatePair", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.surrogatePair()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid surrogate pair"] }])
    })

    test("uRL", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.url()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid url"] }])
    })

    test("uUID", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.UUID()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid UUID"] }])
    })

    test("uppercase", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.uppercase()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid uppercase"] }])
    })

    test("variableWidth", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.variableWidth()
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123-234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid variable width"] }])
    })

    test("whitelisted", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @val.whiteListed({ chars: 'abcdefghijklmnopqrstuvwxyz-' })
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123.234" }, { ...option, type: Dummy, })
        expect(result.issues).toMatchObject([{ path: "property", messages: ["Invalid white listed"] }])
    })

    it("Should not error if provided string validator", () => {
        @reflect.parameterProperties()
        class Dummy {
            constructor(
                @createValidation("hola")
                public property: string
            ) { }
        }
        const result = convert({ property: "abc123.234" }, { ...option, type: Dummy, })
        expect(result.issues).toBeUndefined()
    })
})