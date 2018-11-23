import { decorateClass, TypeDecorator } from "@plumjs/reflect";

import { val, validate, validateArray, validateObject } from "../src";

function domain() { return decorateClass({}) }

describe("String Validation", () => {

    test("after", async () => {
        @domain()
        class Dummy {
            constructor(@val.after({ date: "2018-1-1" }) public property: Date) { }
        }
        expect((await validateObject(new Dummy(new Date("2017-1-1")), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy(new Date("2019-1-1")), {} as any))).toEqual([])

        @domain()
        class DummyString {
            constructor(@val.after({ date: "2018-1-1" }) public property: string) { }
        }
        expect((await validateObject(new DummyString("2017-1-1"), {} as any)).length).toBe(1)
        expect((await validateObject(new DummyString("2019-1-1"), {} as any))).toEqual([])
    })

    test("after()", async () => {
        @domain()
        class Dummy {
            constructor(@val.after() public property: Date) { }
        }
        expect((await validateObject(new Dummy(new Date("2017-1-1")), {} as any))[0].messages[0]).toContain("today")
    })

    test("alpha", async () => {
        @domain()
        class Dummy {
            constructor(@val.alpha() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("qwqwertyuioasdfghjklcvbnm"), {} as any))).toEqual([])
    })

    test("alphanumeric", async () => {
        @domain()
        class Dummy {
            constructor(@val.alphanumeric() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-()234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("sdfghjxcv12345678cvb"), {} as any))).toEqual([])
    })

    test("ascii", async () => {
        @domain()
        class Dummy {
            constructor(@val.ascii() public property: string) { }
        }
        expect((await validateObject(new Dummy("∂®abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("ghdfgty345678(&^%$-{';"), {} as any))).toEqual([])
    })

    test("base64", async () => {
        @domain()
        class Dummy {
            constructor(@val.base64() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("Zm9vYg=="), {} as any))).toEqual([])
    })

    test("before", async () => {
        @domain()
        class Dummy {
            constructor(@val.before({ date: "2018-1-1" }) public property: Date) { }
        }
        expect((await validateObject(new Dummy(new Date("2019-1-1")), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy(new Date("2017-1-1")), {} as any))).toEqual([])

        @domain()
        class DummyString {
            constructor(@val.before({ date: "2018-1-1" }) public property: string) { }
        }
        expect((await validateObject(new DummyString("2019-1-1"), {} as any)).length).toBe(1)
        expect((await validateObject(new DummyString("2017-1-1"), {} as any))).toEqual([])
    })

    test("before()", async () => {
        @domain()
        class Dummy {
            constructor(@val.before() public property: Date) { }
        }
        expect((await validateObject(new Dummy(new Date("2025-1-1")), {} as any))[0].messages[0]).toContain("today")
    })

    test("byteLength", async () => {
        @domain()
        class Dummy {
            constructor(@val.byteLength({ max: 5 }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("123"), {} as any))).toEqual([])
    })

    test("creditCard", async () => {
        @domain()
        class Dummy {
            constructor(@val.creditCard() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("4716-2210-5188-5662"), {} as any))).toEqual([])
    })

    test("currency", async () => {
        @domain()
        class Dummy {
            constructor(@val.currency() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("12345.78"), {} as any))).toEqual([])
    })

    test("dataURI", async () => {
        @domain()
        class Dummy {
            constructor(@val.dataURI() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("data:text/html,%3Ch1%3EHello%2C%20World!%3C%2Fh1%3E"), {} as any))).toEqual([])
    })

    test("decimal", async () => {
        @domain()
        class Dummy {
            constructor(@val.decimal() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("1234.6788"), {} as any))).toEqual([])
    })

    test("divisibleBy", async () => {
        @domain()
        class Dummy {
            constructor(@val.divisibleBy({ num: 4 }) public property: string) { }
        }
        expect((await validateObject(new Dummy("25"), {} as any)).length).toBe(1)
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test("email", async () => {
        @domain()
        class Dummy {
            constructor(@val.email() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("support@gmail.com"), {} as any))).toEqual([])
    })

    test("fQDN", async () => {
        @domain()
        class Dummy {
            constructor(@val.fqdn() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("domain.com"), {} as any))).toEqual([])
    })

    test("float", async () => {
        @domain()
        class Dummy {
            constructor(@val.float() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("12345.99"), {} as any))).toEqual([])
    })

    test("fullWidth", async () => {
        @domain()
        class Dummy {
            constructor(@val.fullWidth() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("ひらがな・カタカナ、．漢字"), {} as any))).toEqual([])
    })

    test("halfWidth", async () => {
        @domain()
        class Dummy {
            constructor(@val.halfWidth() public property: string) { }
        }
        expect((await validateObject(new Dummy("あいうえお"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy('!"#$%&()<>/+=-_? ~^|.,@`{}[]'), {} as any))).toEqual([])
    })

    test("hash", async () => {
        @domain()
        class Dummy {
            constructor(@val.hash({ algorithm: "md5" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("d94f3f016ae679c3008de268209132f2"), {} as any))).toEqual([])
    })

    test("hexColor", async () => {
        @domain()
        class Dummy {
            constructor(@val.hexColor() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("#ffcc33"), {} as any))).toEqual([])
    })

    test("hexadecimal", async () => {
        @domain()
        class Dummy {
            constructor(@val.hexadecimal() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("123abf"), {} as any))).toEqual([])
    })

    test("iP", async () => {
        @domain()
        class Dummy {
            constructor(@val.ip() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("127.0.0.1"), {} as any))).toEqual([])
    })

    test("iSBN", async () => {
        @domain()
        class Dummy {
            constructor(@val.isbn() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("3-8362-2119-5"), {} as any))).toEqual([])
    })

    test("iSIN", async () => {
        @domain()
        class Dummy {
            constructor(@val.isin() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("AU0000XVGZA3"), {} as any))).toEqual([])
    })

    test("iSO31661Alpha2", async () => {
        @domain()
        class Dummy {
            constructor(@val.iso31661Alpha2() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("FR"), {} as any))).toEqual([])
    })

    test("iSO8601", async () => {
        @domain()
        class Dummy {
            constructor(@val.iso8601() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("2009-12T12:34"), {} as any))).toEqual([])
    })

    test("iSRC", async () => {
        @domain()
        class Dummy {
            constructor(@val.isrc() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("USAT29900609"), {} as any))).toEqual([])
    })

    test("iSSN", async () => {
        @domain()
        class Dummy {
            constructor(@val.issn() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("0378-5955"), {} as any))).toEqual([])
    })

    test("int", async () => {
        @domain()
        class Dummy {
            constructor(@val.int() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("1234"), {} as any))).toEqual([])
    })

    test("jSON", async () => {
        @domain()
        class Dummy {
            constructor(@val.json() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy('{ "key": "value" }'), {} as any))).toEqual([])
    })

    test("latLong", async () => {
        @domain()
        class Dummy {
            constructor(@val.latLong() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("(-17.738223, 85.605469)"), {} as any))).toEqual([])
    })

    test("length", async () => {
        @domain()
        class Dummy {
            constructor(@val.length({ max: 10 }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234fds"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("abc123"), {} as any))).toEqual([])
    })

    test("lowercase", async () => {
        @domain()
        class Dummy {
            constructor(@val.lowerCase() public property: string) { }
        }
        expect((await validateObject(new Dummy("DSsafdsa"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("fdsafsa"), {} as any))).toEqual([])
    })

    test("mACAddress", async () => {
        @domain()
        class Dummy {
            constructor(@val.macAddress() public property: string) { }
        }
        expect((await validateObject(new Dummy("01:02:03:04:05"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("FF:FF:FF:FF:FF:FF"), {} as any))).toEqual([])
    })

    test("matches", async () => {
        @domain()
        class Dummy {
            constructor(@val.matches({ pattern: /^[a-z0-9 ]+$/i }) public property: string) { }
        }
        expect((await validateObject(new Dummy("the;hero"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("the hero"), {} as any))).toEqual([])
    })

    test("mD5", async () => {
        @domain()
        class Dummy {
            constructor(@val.md5() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("751adbc511ccbe8edf23d486fa4581cd"), {} as any))).toEqual([])
    })

    test("mimeType", async () => {
        @domain()
        class Dummy {
            constructor(@val.mimeType() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("application/json"), {} as any))).toEqual([])
    })

    test("mobilePhone", async () => {
        @domain()
        class Dummy {
            constructor(@val.mobilePhone({ locale: "id-ID" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("082276758899"), {} as any))).toEqual([])
    })

    test("mongoId", async () => {
        @domain()
        class Dummy {
            constructor(@val.mongoId() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("507f1f77bcf86cd799439011"), {} as any))).toEqual([])
    })

    test("multibyte", async () => {
        @domain()
        class Dummy {
            constructor(@val.multibyte() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("ひらがな・カタカナ、．漢字"), {} as any))).toEqual([])
    })

    test("numeric", async () => {
        @domain()
        class Dummy {
            constructor(@val.numeric() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("12345776"), {} as any))).toEqual([])
    })

    test("port", async () => {
        @domain()
        class Dummy {
            constructor(@val.port() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("8080"), {} as any))).toEqual([])
    })

    test("postalCode", async () => {
        @domain()
        class Dummy {
            constructor(@val.postalCode({ locale: "any" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test("surrogatePair", async () => {
        @domain()
        class Dummy {
            constructor(@val.surrogatePair() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("ABC千𥧄1-2-3"), {} as any))).toEqual([])
    })

    test("uRL", async () => {
        @domain()
        class Dummy {
            constructor(@val.url() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("http://www.foobar.com/"), {} as any))).toEqual([])
    })

    test("uUID", async () => {
        @domain()
        class Dummy {
            constructor(@val.UUID() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("A987FBC9-4BED-3078-CF07-9141BA07C9F3"), {} as any))).toEqual([])
    })

    test("uppercase", async () => {
        @domain()
        class Dummy {
            constructor(@val.uppercase() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("HDDJFBVJKDNDD"), {} as any))).toEqual([])
    })

    test("variableWidth", async () => {
        @domain()
        class Dummy {
            constructor(@val.variableWidth() public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("ひらがなカタカナ漢字ABCDE"), {} as any))).toEqual([])
    })

    test("whitelisted", async () => {
        @domain()
        class Dummy {
            constructor(@val.whiteListed({ chars: 'abcdefghijklmnopqrstuvwxyz-' }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123.234"), {} as any)).length).toBe(1)
        expect((await validateObject(new Dummy("foobar-"), {} as any))).toEqual([])
    })


})

describe("Custom Message", () => {

    test("after", async () => {
        @domain()
        class Dummy {
            constructor(@val.after({ message: "Invalid", date: "2018-1-1" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("2017-1-1"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("alpha", async () => {
        @domain()
        class Dummy {
            constructor(@val.alpha({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("alphanumeric", async () => {
        @domain()
        class Dummy {
            constructor(@val.alphanumeric({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-()234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("ascii", async () => {
        @domain()
        class Dummy {
            constructor(@val.ascii({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("∂®abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("base64", async () => {
        @domain()
        class Dummy {
            constructor(@val.base64({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("before", async () => {
        @domain()
        class Dummy {
            constructor(@val.before({ message: "Invalid", date: "2018-1-1" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("2019-1-1"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("byteLength", async () => {
        @domain()
        class Dummy {
            constructor(@val.byteLength({ message: "Invalid", max: 5 }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("creditCard", async () => {
        @domain()
        class Dummy {
            constructor(@val.creditCard({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("currency", async () => {
        @domain()
        class Dummy {
            constructor(@val.currency({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("dataURI", async () => {
        @domain()
        class Dummy {
            constructor(@val.dataURI({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("decimal", async () => {
        @domain()
        class Dummy {
            constructor(@val.decimal({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("divisibleBy", async () => {
        @domain()
        class Dummy {
            constructor(@val.divisibleBy({ message: "Invalid", num: 4 }) public property: string) { }
        }
        expect((await validateObject(new Dummy("25"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("email", async () => {
        @domain()
        class Dummy {
            constructor(@val.email({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("fQDN", async () => {
        @domain()
        class Dummy {
            constructor(@val.fqdn({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("float", async () => {
        @domain()
        class Dummy {
            constructor(@val.float({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("fullWidth", async () => {
        @domain()
        class Dummy {
            constructor(@val.fullWidth({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("halfWidth", async () => {
        @domain()
        class Dummy {
            constructor(@val.halfWidth({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("あいうえお"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("hash", async () => {
        @domain()
        class Dummy {
            constructor(@val.hash({ message: "Invalid", algorithm: "md5" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("hexColor", async () => {
        @domain()
        class Dummy {
            constructor(@val.hexColor({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("hexadecimal", async () => {
        @domain()
        class Dummy {
            constructor(@val.hexadecimal({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("iP", async () => {
        @domain()
        class Dummy {
            constructor(@val.ip({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("iSBN", async () => {
        @domain()
        class Dummy {
            constructor(@val.isbn({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("iSIN", async () => {
        @domain()
        class Dummy {
            constructor(@val.isin({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("iSO31661Alpha2", async () => {
        @domain()
        class Dummy {
            constructor(@val.iso31661Alpha2({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("iSO8601", async () => {
        @domain()
        class Dummy {
            constructor(@val.iso8601({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("iSRC", async () => {
        @domain()
        class Dummy {
            constructor(@val.isrc({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("iSSN", async () => {
        @domain()
        class Dummy {
            constructor(@val.issn({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("int", async () => {
        @domain()
        class Dummy {
            constructor(@val.int({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("jSON", async () => {
        @domain()
        class Dummy {
            constructor(@val.json({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("latLong", async () => {
        @domain()
        class Dummy {
            constructor(@val.latLong({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("length", async () => {
        @domain()
        class Dummy {
            constructor(@val.length({ message: "Invalid", max: 10 }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234fds"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("lowercase", async () => {
        @domain()
        class Dummy {
            constructor(@val.lowerCase({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("DSsafdsa"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("mACAddress", async () => {
        @domain()
        class Dummy {
            constructor(@val.macAddress({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("01:02:03:04:05"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("matches", async () => {
        @domain()
        class Dummy {
            constructor(@val.matches({ pattern: /^[a-z0-9 ]+$/i,  message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("the;name"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("mD5", async () => {
        @domain()
        class Dummy {
            constructor(@val.md5({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("mimeType", async () => {
        @domain()
        class Dummy {
            constructor(@val.mimeType({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("mobilePhone", async () => {
        @domain()
        class Dummy {
            constructor(@val.mobilePhone({ message: "Invalid", locale: "id-ID" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("mongoId", async () => {
        @domain()
        class Dummy {
            constructor(@val.mongoId({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("multibyte", async () => {
        @domain()
        class Dummy {
            constructor(@val.multibyte({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("numeric", async () => {
        @domain()
        class Dummy {
            constructor(@val.numeric({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("port", async () => {
        @domain()
        class Dummy {
            constructor(@val.port({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("postalCode", async () => {
        @domain()
        class Dummy {
            constructor(@val.postalCode({ message: "Invalid", locale: "any" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("surrogatePair", async () => {
        @domain()
        class Dummy {
            constructor(@val.surrogatePair({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("uRL", async () => {
        @domain()
        class Dummy {
            constructor(@val.url({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("uUID", async () => {
        @domain()
        class Dummy {
            constructor(@val.UUID({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("uppercase", async () => {
        @domain()
        class Dummy {
            constructor(@val.uppercase({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("variableWidth", async () => {
        @domain()
        class Dummy {
            constructor(@val.variableWidth({ message: "Invalid" }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123-234"), {} as any))[0].messages).toEqual(["Invalid"])
    })

    test("whitelisted", async () => {
        @domain()
        class Dummy {
            constructor(@val.whiteListed({ message: "Invalid", chars: 'abcdefghijklmnopqrstuvwxyz-' }) public property: string) { }
        }
        expect((await validateObject(new Dummy("abc123.234"), {} as any))[0].messages).toEqual(["Invalid"])
    })


})


describe("Object Validation", () => {

    it("Should validate object", async () => {
        @domain()
        class ClientModel {
            constructor(
                @val.email()
                public email: string,
                @val.email()
                public secondaryEmail: string
            ) { }
        }
        const result = await validateObject(new ClientModel("kitty", "doggy"), {} as any)
        expect(result).toMatchObject([
            { path: ["email"] },
            { path: ["secondaryEmail"] }
        ])
    })

    it("Should validate nested object", async () => {
        class CreditCardModel {
            constructor(
                @val.creditCard()
                public creditCard: string,
            ) { }
        }
        @domain()
        class ClientModel {
            constructor(
                @val.email()
                public email: string,
                @val.email()
                public secondaryEmail: string,
                public spouse: CreditCardModel
            ) { }
        }
        const result = await validateObject(new ClientModel("kitty", "doggy", new CreditCardModel("kitty")), {} as any)
        expect(result).toMatchObject([
            { path: ["email"] },
            { path: ["secondaryEmail"] },
            { path: ["spouse", "creditCard"] }
        ])
    })
})

describe("Array Validation", () => {
    it("Should validate object inside array", async () => {
        @domain()
        class Dummy {
            constructor(
                @val.email()
                public email: string,
            ) { }
        }
        const result = await validateArray([new Dummy("support@gmail.com"), new Dummy("noreply@gmail.com"), new Dummy("kitty")], [], {} as any)
        expect(result).toMatchObject([
            { path: ["2", "email"] }
        ])
    })
    it("Should validate nested array inside object", async () => {
        @domain()
        class Empty {
            constructor(
                public dummies: Dummy[],
            ) { }
        }
        @domain()
        class Dummy {
            constructor(
                @val.email()
                public email: string,
            ) { }
        }
        const dummies = [new Dummy("support@gmail.com"), new Dummy("noreply@gmail.com"), new Dummy("kitty")]
        const result = await validateArray([new Empty(dummies)], [], {} as any)
        expect(result).toMatchObject([
            { path: ["0", "dummies", "2", "email"] }
        ])
    })
})

describe("Durability", () => {
    it("Should treat property as required except @optional() defined", async () => {
        @domain()
        class ClientModel {
            constructor(
                @val.email()
                public email?: string | null | undefined,
            ) { }
        }
        expect((await validateObject(new ClientModel(), {} as any))).toMatchObject([{ "messages": ["Required"] }])
        expect((await validateObject(new ClientModel(""), {} as any))).toMatchObject([{ "messages": ["Required"] }])
        expect((await validateObject(new ClientModel("abc"), {} as any))).toMatchObject([{ "messages": ["Invalid email address"] }])
        expect((await validateObject(new ClientModel("support@gmail.com"), {} as any))).toEqual([])
    })

    it("Should skip required if @option() is provided", async () => {
        @domain()
        class ClientModel {
            constructor(
                @val.optional()
                @val.email()
                public email?: string | null | undefined,
            ) { }
        }
        expect((await validateObject(new ClientModel(), {} as any)).length).toBe(0)
        expect((await validateObject(new ClientModel(""), {} as any)).length).toBe(0)
        expect((await validateObject(new ClientModel(null), {} as any)).length).toBe(0)
        expect((await validateObject(new ClientModel("abc"), {} as any))).toMatchObject([{ "messages": ["Invalid email address"] }])
    })

    it("Should not error if provided boolean", async () => {
        @domain()
        class ClientModel {
            constructor(
                @val.email()
                public hasEmail: boolean,
            ) { }
        }
        const result = await validateObject(new ClientModel(false), {} as any)
        expect(result).toMatchObject([{
            path: ["hasEmail"]
        }])
    })
    it("Should not error if provided number", async () => {
        @domain()
        class ClientModel {
            constructor(
                @val.email()
                public age: number,
            ) { }
        }
        const result = await validateObject(new ClientModel(50), {} as any)
        expect(result).toMatchObject([{
            path: ["age"]
        }])
    })
    it("Should not error if provided function", async () => {
        @domain()
        class ClientModel {
            constructor(
                @val.email()
                public fn: () => void,
            ) { }
        }
        const result = await validateObject(new ClientModel(() => { }), {} as any)
        expect(result).toMatchObject([{
            path: ["fn"]
        }])
    })
})

describe("Partial Validation", () => {
    class ClientModel {
        constructor(
            public name?: string,
            @val.email()
            public email?: string,
        ) { }
    }
    it("Should called without error", () => {
        const result = val.partial(ClientModel)
        expect(result).not.toBeNull()
    })
    it("Should skip required validation on partial type", async () => {
        const result = await validate(new ClientModel(), [<TypeDecorator>{ type: "Override", object: ClientModel, info: "Partial" }], [], {} as any)
        expect(result).toEqual([])
    })
})