import { decorateClass, reflect } from "tinspector";
import { validate, val } from '../src';
import Validator from "validator"

function model() { return decorateClass({}) }

describe("String Validation", () => {

    test.only("after", async () => {
        @model()
        class Dummy {
            constructor(@val.after() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("alpha", async () => {
        @model()
        class Dummy {
            constructor(@val.alpha() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("alphanumeric", async () => {
        @model()
        class Dummy {
            constructor(@val.alphanumeric() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("ascii", async () => {
        @model()
        class Dummy {
            constructor(@val.ascii() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("base64", async () => {
        @model()
        class Dummy {
            constructor(@val.base64() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("before", async () => {
        @model()
        class Dummy {
            constructor(@val.before() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("boolean", async () => {
        @model()
        class Dummy {
            constructor(@val.boolean() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("byteLength", async () => {
        @model()
        class Dummy {
            constructor(@val.byteLength() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("creditCard", async () => {
        @model()
        class Dummy {
            constructor(@val.creditCard() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("currency", async () => {
        @model()
        class Dummy {
            constructor(@val.currency() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("dataURI", async () => {
        @model()
        class Dummy {
            constructor(@val.dataURI() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("decimal", async () => {
        @model()
        class Dummy {
            constructor(@val.decimal() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("divisibleBy", async () => {
        @model()
        class Dummy {
            constructor(@val.divisibleBy() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("email", async () => {
        @model()
        class Dummy {
            constructor(@val.email() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("empty", async () => {
        @model()
        class Dummy {
            constructor(@val.empty() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("fQDN", async () => {
        @model()
        class Dummy {
            constructor(@val.fQDN() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("float", async () => {
        @model()
        class Dummy {
            constructor(@val.float() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("fullWidth", async () => {
        @model()
        class Dummy {
            constructor(@val.fullWidth() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("halfWidth", async () => {
        @model()
        class Dummy {
            constructor(@val.halfWidth() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("hash", async () => {
        @model()
        class Dummy {
            constructor(@val.hash() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("hexColor", async () => {
        @model()
        class Dummy {
            constructor(@val.hexColor() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("hexadecimal", async () => {
        @model()
        class Dummy {
            constructor(@val.hexadecimal() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("iP", async () => {
        @model()
        class Dummy {
            constructor(@val.iP() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("iSBN", async () => {
        @model()
        class Dummy {
            constructor(@val.iSBN() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("iSIN", async () => {
        @model()
        class Dummy {
            constructor(@val.iSIN() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("iSO31661Alpha2", async () => {
        @model()
        class Dummy {
            constructor(@val.iSO31661Alpha2() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("iSO8601", async () => {
        @model()
        class Dummy {
            constructor(@val.iSO8601() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("iSRC", async () => {
        @model()
        class Dummy {
            constructor(@val.iSRC() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("iSSN", async () => {
        @model()
        class Dummy {
            constructor(@val.iSSN() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("int", async () => {
        @model()
        class Dummy {
            constructor(@val.int() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("jSON", async () => {
        @model()
        class Dummy {
            constructor(@val.jSON() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("latLong", async () => {
        @model()
        class Dummy {
            constructor(@val.latLong() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("length", async () => {
        @model()
        class Dummy {
            constructor(@val.length() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("lowercase", async () => {
        @model()
        class Dummy {
            constructor(@val.lowercase() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("mACAddress", async () => {
        @model()
        class Dummy {
            constructor(@val.mACAddress() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("mD5", async () => {
        @model()
        class Dummy {
            constructor(@val.mD5() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("mimeType", async () => {
        @model()
        class Dummy {
            constructor(@val.mimeType() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("mobilePhone", async () => {
        @model()
        class Dummy {
            constructor(@val.mobilePhone() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("mongoId", async () => {
        @model()
        class Dummy {
            constructor(@val.mongoId() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("multibyte", async () => {
        @model()
        class Dummy {
            constructor(@val.multibyte() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("numeric", async () => {
        @model()
        class Dummy {
            constructor(@val.numeric() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("port", async () => {
        @model()
        class Dummy {
            constructor(@val.port() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("postalCode", async () => {
        @model()
        class Dummy {
            constructor(@val.postalCode() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("surrogatePair", async () => {
        @model()
        class Dummy {
            constructor(@val.surrogatePair() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("uRL", async () => {
        @model()
        class Dummy {
            constructor(@val.uRL() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("uUID", async () => {
        @model()
        class Dummy {
            constructor(@val.uUID() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("uppercase", async () => {
        @model()
        class Dummy {
            constructor(@val.uppercase() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("variableWidth", async () => {
        @model()
        class Dummy {
            constructor(@val.variableWidth() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
    })

    test.only("whitelisted", async () => {
        @model()
        class Dummy {
            constructor(@val.whitelisted() public property: string) { }
        }
        expect(validate(new Dummy("abc123-234")))
            .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
        //expect(validate(new Dummy(""))).toEqual([])
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
            messages: ["Invalid email address"], path: ["email"], value: "kitty"
        },
        {
            messages: ["Invalid email address"], path: ["secondaryEmail"], value: "doggy"
        }])
    })
})