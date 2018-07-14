import { decorateClass, reflect } from "tinspector";
import { validate, val } from '../src';
import Validator from "validator"

function model() { return decorateClass({}) }

describe("String Validation", () => {

    test("after", async () => {
        @model()
        class Dummy {
            constructor(@val.after({date: "2018-1-1"}) public property: string) { }
        }
        expect(validate(new Dummy("2017-1-1")).length).toBe(1)
        expect(validate(new Dummy("2019-1-1"))).toEqual([])
    })

    test("alpha", async () => {
        @model()
        class Dummy {
            constructor(@val.alpha() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("qwqwertyuioasdfghjklcvbnm"))).toEqual([])
    })

    test("alphanumeric", async () => {
        @model()
        class Dummy {
            constructor(@val.alphanumeric() public property: string) { }
        }
        expect(validate(new Dummy("abc123-()234")).length).toBe(1)
        expect(validate(new Dummy("sdfghjxcv12345678cvb"))).toEqual([])
    })

    test("ascii", async () => {
        @model()
        class Dummy {
            constructor(@val.ascii() public property: string) { }
        }
        expect(validate(new Dummy("∂®abc123-234")).length).toBe(1)
        expect(validate(new Dummy("ghdfgty345678(&^%$-{';"))).toEqual([])
    })

    test("base64", async () => {
        @model()
        class Dummy {
            constructor(@val.base64() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("Zm9vYg=="))).toEqual([])
    })

    test("before", async () => {
        @model()
        class Dummy {
            constructor(@val.before({date: "2018-1-1"}) public property: string) { }
        }
        expect(validate(new Dummy("2019-1-1")).length).toBe(1)
        expect(validate(new Dummy("2017-1-1"))).toEqual([])
    })

    test("boolean", async () => {
        @model()
        class Dummy {
            constructor(@val.boolean() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("true"))).toEqual([])
    })

    test("byteLength", async () => {
        @model()
        class Dummy {
            constructor(@val.byteLength({ options: { max: 5 } }) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("123"))).toEqual([])
    })

    test("creditCard", async () => {
        @model()
        class Dummy {
            constructor(@val.creditCard() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("4716-2210-5188-5662"))).toEqual([])
    })

    test("currency", async () => {
        @model()
        class Dummy {
            constructor(@val.currency() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("12345.78"))).toEqual([])
    })

    test("dataURI", async () => {
        @model()
        class Dummy {
            constructor(@val.dataURI() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("data:text/html,%3Ch1%3EHello%2C%20World!%3C%2Fh1%3E"))).toEqual([])
    })

    test("decimal", async () => {
        @model()
        class Dummy {
            constructor(@val.decimal() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("1234.6788"))).toEqual([])
    })

    test("divisibleBy", async () => {
        @model()
        class Dummy {
            constructor(@val.divisibleBy({ num: 4 }) public property: string) { }
        }
        expect(validate(new Dummy("25")).length).toBe(1)
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test("email", async () => {
        @model()
        class Dummy {
            constructor(@val.email() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("support@gmail.com"))).toEqual([])
    })

    test("empty", async () => {
        @model()
        class Dummy {
            constructor(@val.empty() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy(""))).toEqual([])
    })

    test("fQDN", async () => {
        @model()
        class Dummy {
            constructor(@val.fQDN() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("domain.com"))).toEqual([])
    })

    test("float", async () => {
        @model()
        class Dummy {
            constructor(@val.float() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("12345.99"))).toEqual([])
    })

    test("fullWidth", async () => {
        @model()
        class Dummy {
            constructor(@val.fullWidth() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("ひらがな・カタカナ、．漢字"))).toEqual([])
    })

    test("halfWidth", async () => {
        @model()
        class Dummy {
            constructor(@val.halfWidth() public property: string) { }
        }
        expect(validate(new Dummy("あいうえお")).length).toBe(1)
        expect(validate(new Dummy('!"#$%&()<>/+=-_? ~^|.,@`{}[]'))).toEqual([])
    })

    test("hash", async () => {
        @model()
        class Dummy {
            constructor(@val.hash({ algorithm: "md5" }) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("d94f3f016ae679c3008de268209132f2"))).toEqual([])
    })

    test("hexColor", async () => {
        @model()
        class Dummy {
            constructor(@val.hexColor() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("#ffcc33"))).toEqual([])
    })

    test("hexadecimal", async () => {
        @model()
        class Dummy {
            constructor(@val.hexadecimal() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("123abf"))).toEqual([])
    })

    test("iP", async () => {
        @model()
        class Dummy {
            constructor(@val.ip() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("127.0.0.1"))).toEqual([])
    })

    test("iSBN", async () => {
        @model()
        class Dummy {
            constructor(@val.isbn() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("3-8362-2119-5"))).toEqual([])
    })

    test("iSIN", async () => {
        @model()
        class Dummy {
            constructor(@val.isin() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("AU0000XVGZA3"))).toEqual([])
    })

    test("iSO31661Alpha2", async () => {
        @model()
        class Dummy {
            constructor(@val.iso31661Alpha2() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("FR"))).toEqual([])
    })

    test("iSO8601", async () => {
        @model()
        class Dummy {
            constructor(@val.iso8601() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("2009-12T12:34"))).toEqual([])
    })

    test("iSRC", async () => {
        @model()
        class Dummy {
            constructor(@val.isrc() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("USAT29900609"))).toEqual([])
    })

    test("iSSN", async () => {
        @model()
        class Dummy {
            constructor(@val.issn() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("0378-5955"))).toEqual([])
    })

    test("int", async () => {
        @model()
        class Dummy {
            constructor(@val.int() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("1234"))).toEqual([])
    })

    test("jSON", async () => {
        @model()
        class Dummy {
            constructor(@val.json() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy('{ "key": "value" }'))).toEqual([])
    })

    test("latLong", async () => {
        @model()
        class Dummy {
            constructor(@val.latLong() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("(-17.738223, 85.605469)"))).toEqual([])
    })

    test("length", async () => {
        @model()
        class Dummy {
            constructor(@val.length({ options: { max: 10 } }) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234fds")).length).toBe(1)
        expect(validate(new Dummy("abc123"))).toEqual([])
    })

    test("lowercase", async () => {
        @model()
        class Dummy {
            constructor(@val.lowerCase() public property: string) { }
        }
        expect(validate(new Dummy("DSsafdsa")).length).toBe(1)
        expect(validate(new Dummy("fdsafsa"))).toEqual([])
    })

    test("mACAddress", async () => {
        @model()
        class Dummy {
            constructor(@val.macAddress() public property: string) { }
        }
        expect(validate(new Dummy("01:02:03:04:05")).length).toBe(1)
        expect(validate(new Dummy("FF:FF:FF:FF:FF:FF"))).toEqual([])
    })

    test("mD5", async () => {
        @model()
        class Dummy {
            constructor(@val.md5() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("751adbc511ccbe8edf23d486fa4581cd"))).toEqual([])
    })

    test("mimeType", async () => {
        @model()
        class Dummy {
            constructor(@val.mimeType() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("application/json"))).toEqual([])
    })

    test("mobilePhone", async () => {
        @model()
        class Dummy {
            constructor(@val.mobilePhone({ locale: "id-ID" }) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("082276758899"))).toEqual([])
    })

    test("mongoId", async () => {
        @model()
        class Dummy {
            constructor(@val.mongoId() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("507f1f77bcf86cd799439011"))).toEqual([])
    })

    test("multibyte", async () => {
        @model()
        class Dummy {
            constructor(@val.multibyte() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("ひらがな・カタカナ、．漢字"))).toEqual([])
    })

    test("numeric", async () => {
        @model()
        class Dummy {
            constructor(@val.numeric() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("12345776"))).toEqual([])
    })

    test("port", async () => {
        @model()
        class Dummy {
            constructor(@val.port() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("8080"))).toEqual([])
    })

    test("postalCode", async () => {
        @model()
        class Dummy {
            constructor(@val.postalCode({ locale: "any" }) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test("surrogatePair", async () => {
        @model()
        class Dummy {
            constructor(@val.surrogatePair() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("ABC千𥧄1-2-3"))).toEqual([])
    })

    test("uRL", async () => {
        @model()
        class Dummy {
            constructor(@val.url() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("http://www.foobar.com/"))).toEqual([])
    })

    test("uUID", async () => {
        @model()
        class Dummy {
            constructor(@val.UUID() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("A987FBC9-4BED-3078-CF07-9141BA07C9F3"))).toEqual([])
    })

    test("uppercase", async () => {
        @model()
        class Dummy {
            constructor(@val.uppercase() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("HDDJFBVJKDNDD"))).toEqual([])
    })

    test("variableWidth", async () => {
        @model()
        class Dummy {
            constructor(@val.variableWidth() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")).length).toBe(1)
        expect(validate(new Dummy("ひらがなカタカナ漢字ABCDE"))).toEqual([])
    })

    test("whitelisted", async () => {
        @model()
        class Dummy {
            constructor(@val.whiteListed({chars: 'abcdefghijklmnopqrstuvwxyz-'}) public property: string) { }
        }
        expect(validate(new Dummy("abc123.234")).length).toBe(1)
        expect(validate(new Dummy("foobar-"))).toEqual([])
    })


})

describe("Custom Message", () => {

    test("after", async () => {
        @model()
        class Dummy {
            constructor(@val.after({message: "Invalid", date: "2018-1-1"}) public property: string) { }
        }
        expect(validate(new Dummy("2017-1-1"))[0].messages).toEqual(["Invalid"])
    })

    test("alpha", async () => {
        @model()
        class Dummy {
            constructor(@val.alpha({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("alphanumeric", async () => {
        @model()
        class Dummy {
            constructor(@val.alphanumeric({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-()234"))[0].messages).toEqual(["Invalid"])
    })

    test("ascii", async () => {
        @model()
        class Dummy {
            constructor(@val.ascii({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("∂®abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("base64", async () => {
        @model()
        class Dummy {
            constructor(@val.base64({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("before", async () => {
        @model()
        class Dummy {
            constructor(@val.before({message: "Invalid", date: "2018-1-1"}) public property: string) { }
        }
        expect(validate(new Dummy("2019-1-1"))[0].messages).toEqual(["Invalid"])
    })

    test("boolean", async () => {
        @model()
        class Dummy {
            constructor(@val.boolean({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("byteLength", async () => {
        @model()
        class Dummy {
            constructor(@val.byteLength({message: "Invalid", options: { max: 5 } }) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("creditCard", async () => {
        @model()
        class Dummy {
            constructor(@val.creditCard({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("currency", async () => {
        @model()
        class Dummy {
            constructor(@val.currency({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("dataURI", async () => {
        @model()
        class Dummy {
            constructor(@val.dataURI({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("decimal", async () => {
        @model()
        class Dummy {
            constructor(@val.decimal({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("divisibleBy", async () => {
        @model()
        class Dummy {
            constructor(@val.divisibleBy({message: "Invalid", num: 4 }) public property: string) { }
        }
        expect(validate(new Dummy("25"))[0].messages).toEqual(["Invalid"])
    })

    test("email", async () => {
        @model()
        class Dummy {
            constructor(@val.email({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("empty", async () => {
        @model()
        class Dummy {
            constructor(@val.empty({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("fQDN", async () => {
        @model()
        class Dummy {
            constructor(@val.fQDN({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("float", async () => {
        @model()
        class Dummy {
            constructor(@val.float({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("fullWidth", async () => {
        @model()
        class Dummy {
            constructor(@val.fullWidth({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("halfWidth", async () => {
        @model()
        class Dummy {
            constructor(@val.halfWidth({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("あいうえお"))[0].messages).toEqual(["Invalid"])
    })

    test("hash", async () => {
        @model()
        class Dummy {
            constructor(@val.hash({message: "Invalid", algorithm: "md5" }) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("hexColor", async () => {
        @model()
        class Dummy {
            constructor(@val.hexColor({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("hexadecimal", async () => {
        @model()
        class Dummy {
            constructor(@val.hexadecimal({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("iP", async () => {
        @model()
        class Dummy {
            constructor(@val.ip({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("iSBN", async () => {
        @model()
        class Dummy {
            constructor(@val.isbn({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("iSIN", async () => {
        @model()
        class Dummy {
            constructor(@val.isin({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("iSO31661Alpha2", async () => {
        @model()
        class Dummy {
            constructor(@val.iso31661Alpha2({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("iSO8601", async () => {
        @model()
        class Dummy {
            constructor(@val.iso8601({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("iSRC", async () => {
        @model()
        class Dummy {
            constructor(@val.isrc({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("iSSN", async () => {
        @model()
        class Dummy {
            constructor(@val.issn({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("int", async () => {
        @model()
        class Dummy {
            constructor(@val.int({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("jSON", async () => {
        @model()
        class Dummy {
            constructor(@val.json({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("latLong", async () => {
        @model()
        class Dummy {
            constructor(@val.latLong({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("length", async () => {
        @model()
        class Dummy {
            constructor(@val.length({message: "Invalid", options: { max: 10 } }) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234fds"))[0].messages).toEqual(["Invalid"])
    })

    test("lowercase", async () => {
        @model()
        class Dummy {
            constructor(@val.lowerCase({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("DSsafdsa"))[0].messages).toEqual(["Invalid"])
    })

    test("mACAddress", async () => {
        @model()
        class Dummy {
            constructor(@val.macAddress({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("01:02:03:04:05"))[0].messages).toEqual(["Invalid"])
    })

    test("mD5", async () => {
        @model()
        class Dummy {
            constructor(@val.md5({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("mimeType", async () => {
        @model()
        class Dummy {
            constructor(@val.mimeType({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("mobilePhone", async () => {
        @model()
        class Dummy {
            constructor(@val.mobilePhone({message: "Invalid", locale: "id-ID" }) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("mongoId", async () => {
        @model()
        class Dummy {
            constructor(@val.mongoId({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("multibyte", async () => {
        @model()
        class Dummy {
            constructor(@val.multibyte({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("numeric", async () => {
        @model()
        class Dummy {
            constructor(@val.numeric({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("port", async () => {
        @model()
        class Dummy {
            constructor(@val.port({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("postalCode", async () => {
        @model()
        class Dummy {
            constructor(@val.postalCode({message: "Invalid", locale: "any" }) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("surrogatePair", async () => {
        @model()
        class Dummy {
            constructor(@val.surrogatePair({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("uRL", async () => {
        @model()
        class Dummy {
            constructor(@val.url({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("uUID", async () => {
        @model()
        class Dummy {
            constructor(@val.UUID({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("uppercase", async () => {
        @model()
        class Dummy {
            constructor(@val.uppercase({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("variableWidth", async () => {
        @model()
        class Dummy {
            constructor(@val.variableWidth({message: "Invalid"}) public property: string) { }
        }
        expect(validate(new Dummy("abc123-234"))[0].messages).toEqual(["Invalid"])
    })

    test("whitelisted", async () => {
        @model()
        class Dummy {
            constructor(@val.whiteListed({message: "Invalid", chars: 'abcdefghijklmnopqrstuvwxyz-'}) public property: string) { }
        }
        expect(validate(new Dummy("abc123.234"))[0].messages).toEqual(["Invalid"])
    })


})


describe("Object Validation", () => {
    
    it("Should validate object", () => {
        @model()
        class ClientModel {
            constructor(
                @val.email()
                public email: string,
                @val.email()
                public secondaryEmail: string
            ) { }
        }
        const result = validate(new ClientModel("kitty", "doggy"))
        expect(result).toEqual([{
            messages: ["Invalid value provided"], path: ["email"], value: "kitty"
        },
        {
            messages: ["Invalid value provided"], path: ["secondaryEmail"], value: "doggy"
        }])
    })

    it("Should validate nested object", () => {
        class CreditCardModel {
            constructor(
                @val.creditCard()
                public creditCard: string,
            ) { }
        }
        @model()
        class ClientModel {
            constructor(
                @val.email()
                public email: string,
                @val.email()
                public secondaryEmail: string,
                public spouse:CreditCardModel
            ) { }
        }
        const result = validate(new ClientModel("kitty", "doggy", new CreditCardModel("kitty")))
        expect(result).toEqual([{
            messages: ["Invalid value provided"], path: ["email"], value: "kitty"
        },
        {
            messages: ["Invalid value provided"], path: ["secondaryEmail"], value: "doggy"
        },
        {
            messages: ["Invalid value provided"], path: ["spouse", "creditCard"], value: "kitty"
        }])
    })
})

describe("Durability", () => {
    it("Should not error if provided boolean", () => {
        @model()
        class ClientModel {
            constructor(
                @val.email()
                public hasEmail: boolean,
            ) { }
        }
        const result = validate(new ClientModel(false))
        expect(result).toEqual([{
            messages: ["Invalid value provided"], path: ["hasEmail"], value: "false"
        }])
    })
    it("Should not error if provided number", () => {
        @model()
        class ClientModel {
            constructor(
                @val.email()
                public age: number,
            ) { }
        }
        const result = validate(new ClientModel(50))
        expect(result).toEqual([{
            messages: ["Invalid value provided"], path: ["age"], value: "50"
        }])
    })
    it("Should not error if provided function", () => {
        @model()
        class ClientModel {
            constructor(
                @val.email()
                public fn: () => void,
            ) { }
        }
        const result = validate(new ClientModel(() => {}))
        expect(result).toEqual([{
            messages: ["Invalid value provided"], path: ["fn"], value: "() => {}"
        }])
    })
})