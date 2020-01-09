import { route, val } from "@plumier/plumier"
import { fixture } from "plumier/test/helper"
import supertest = require("supertest")
import reflect from "tinspector"
import tslib = require("tslib")


function domain() { return reflect.parameterProperties() }

async function harness({ validator, type, testValue }: { validator: (...args: any[]) => void; type: Function; testValue: any; }) {
    class Dummy {
        constructor(public property: any) { }
    }
    (<any>Dummy) = tslib.__decorate([
        domain(),
        tslib.__param(0, validator),
        tslib.__metadata("design:paramtypes", [type])
    ], Dummy);
    class DummyController {
        @route.post()
        save(data: Dummy) {
            return data;
        }
    }
    const koa = await fixture(DummyController).initialize()
    const result = await supertest(koa.callback())
        .post("/dummy/save")
        .send({ property: testValue })
        .expect(422)
    expect(result.body.status).toBe(422)
    return result.body.message
}

describe("Validator Decorator Tests", () => {
    test("after", async () => {
        expect(await harness({ validator: val.after({ message: "Lorem ipsum dolor" }), type: Date, testValue: "2017-1-1" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("after()", async () => {
        expect(await harness({ validator: val.after({ message: "Lorem ipsum dolor", date: "2018-1-1" }), type: Date, testValue: new Date("2017-1-1") }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("alpha", async () => {
        expect(await harness({ validator: val.alpha({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("alphanumeric", async () => {
        expect(await harness({ validator: val.alphanumeric({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-()234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("ascii", async () => {
        expect(await harness({ validator: val.ascii({ message: "Lorem ipsum dolor" }), type: String, testValue: "∂®abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("base64", async () => {
        expect(await harness({ validator: val.base64({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("before", async () => {
        expect(await harness({ validator: val.before({ message: "Lorem ipsum dolor", date: "2018-1-1" }), type: Date, testValue: new Date("2019-1-1") }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("before()", async () => {
        expect(await harness({ validator: val.before({ message: "Lorem ipsum dolor" }), type: Date, testValue: new Date("3025-1-1") }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("byteLength", async () => {
        expect(await harness({ validator: val.byteLength({ message: "Lorem ipsum dolor", max: 5 }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("creditCard", async () => {
        expect(await harness({ validator: val.creditCard({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("currency", async () => {
        expect(await harness({ validator: val.currency({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("dataURI", async () => {
        expect(await harness({ validator: val.dataURI({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("decimal", async () => {
        expect(await harness({ validator: val.decimal({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("divisibleBy", async () => {
        expect(await harness({ validator: val.divisibleBy({ message: "Lorem ipsum dolor", num: 4 }), type: String, testValue: "25" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("email", async () => {
        expect(await harness({ validator: val.email({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })

    test("enums", async () => {
        expect(await harness({ validator: val.enums({ enums: ["lorem", "ipsum"], message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("fQDN", async () => {
        expect(await harness({ validator: val.fqdn({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("float", async () => {
        expect(await harness({ validator: val.float({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("fullWidth", async () => {
        expect(await harness({ validator: val.fullWidth({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("halfWidth", async () => {
        expect(await harness({ validator: val.halfWidth({ message: "Lorem ipsum dolor" }), type: String, testValue: "あいうえお" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("hash", async () => {
        expect(await harness({ validator: val.hash({ message: "Lorem ipsum dolor", algorithm: "md5" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("hexColor", async () => {
        expect(await harness({ validator: val.hexColor({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("hexadecimal", async () => {
        expect(await harness({ validator: val.hexadecimal({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("iP", async () => {
        expect(await harness({ validator: val.ip({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("iSBN", async () => {
        expect(await harness({ validator: val.isbn({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("iSIN", async () => {
        expect(await harness({ validator: val.isin({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("iSO31661Alpha2", async () => {
        expect(await harness({ validator: val.iso31661Alpha2({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("iSO8601", async () => {
        expect(await harness({ validator: val.iso8601({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("iSRC", async () => {
        expect(await harness({ validator: val.isrc({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("iSSN", async () => {
        expect(await harness({ validator: val.issn({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("int", async () => {
        expect(await harness({ validator: val.int({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("jSON", async () => {
        expect(await harness({ validator: val.json({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("latLong", async () => {
        expect(await harness({ validator: val.latLong({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("length", async () => {
        expect(await harness({ validator: val.length({ message: "Lorem ipsum dolor", max: 10 }), type: String, testValue: "abc123-234fds" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("lowercase", async () => {
        expect(await harness({ validator: val.lowerCase({ message: "Lorem ipsum dolor" }), type: String, testValue: "DSsafdsa" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("mACAddress", async () => {
        expect(await harness({ validator: val.macAddress({ message: "Lorem ipsum dolor" }), type: String, testValue: "01:02:03:04:05" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("matches", async () => {
        expect(await harness({ validator: val.matches({ message: "Lorem ipsum dolor", pattern: "^[a-z0-9 ]+$" }), type: String, testValue: "the;hero" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("mD5", async () => {
        expect(await harness({ validator: val.md5({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("mimeType", async () => {
        expect(await harness({ validator: val.mimeType({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("mobilePhone", async () => {
        expect(await harness({ validator: val.mobilePhone({ message: "Lorem ipsum dolor", locale: "id-ID" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("mongoId", async () => {
        expect(await harness({ validator: val.mongoId({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("multibyte", async () => {
        expect(await harness({ validator: val.multibyte({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("numeric", async () => {
        expect(await harness({ validator: val.numeric({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("port", async () => {
        expect(await harness({ validator: val.port({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("postalCode", async () => {
        expect(await harness({ validator: val.postalCode({ message: "Lorem ipsum dolor", locale: "ID" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("surrogatePair", async () => {
        expect(await harness({ validator: val.surrogatePair({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("uRL", async () => {
        expect(await harness({ validator: val.url({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("uUID", async () => {
        expect(await harness({ validator: val.UUID({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("uppercase", async () => {
        expect(await harness({ validator: val.uppercase({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("variableWidth", async () => {
        expect(await harness({ validator: val.variableWidth({ message: "Lorem ipsum dolor" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
    
    test("whitelisted", async () => {
        expect(await harness({ validator: val.whiteListed({ message: "Lorem ipsum dolor", chars: 'abcdefghijklmnopqrstuvwxyz-' }), type: String, testValue: "abc123.234" }))
            .toMatchObject([{path: ["data", "property"], messages: ["Lorem ipsum dolor"]}])
    })
})




