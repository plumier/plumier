import { route, val } from "plumier"
import { fixture } from "../helper"
import supertest = require("supertest")
import reflect from "@plumier/reflect"
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
        expect(await harness({ validator: val.after(), type: Date, testValue: "2017-1-1" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Date must be greater than today"] }])
    })

    test("after()", async () => {
        expect(await harness({ validator: val.after({ date: "2018-1-1" }), type: Date, testValue: new Date("2017-1-1") }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Date must be greater than 2018-1-1"] }])
    })

    test("alpha", async () => {
        expect(await harness({ validator: val.alpha(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid alpha"] }])
    })

    test("alphanumeric", async () => {
        expect(await harness({ validator: val.alphanumeric(), type: String, testValue: "abc123-()234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid alpha numeric"] }])
    })

    test("ascii", async () => {
        expect(await harness({ validator: val.ascii(), type: String, testValue: "∂®abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid ascii"] }])
    })

    test("base64", async () => {
        expect(await harness({ validator: val.base64(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid base 64"] }])
    })

    test("before", async () => {
        expect(await harness({ validator: val.before({ date: "2018-1-1" }), type: Date, testValue: new Date("2019-1-1") }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Date must be less than 2018-1-1"] }])
    })

    test("before()", async () => {
        expect(await harness({ validator: val.before(), type: Date, testValue: new Date("3025-1-1") }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Date must be less than today"] }])
    })

    test("byteLength", async () => {
        expect(await harness({ validator: val.byteLength({ max: 5 }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid byte length"] }])
    })

    test("creditCard", async () => {
        expect(await harness({ validator: val.creditCard(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid credit card number"] }])
    })

    test("currency", async () => {
        expect(await harness({ validator: val.currency(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid currency"] }])
    })

    test("dataURI", async () => {
        expect(await harness({ validator: val.dataURI(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid data URI"] }])
    })

    test("decimal", async () => {
        expect(await harness({ validator: val.decimal(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid decimal"] }])
    })

    test("divisibleBy", async () => {
        expect(await harness({ validator: val.divisibleBy({ num: 4 }), type: String, testValue: "25" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Not divisible by 4"] }])
    })

    test("email", async () => {
        expect(await harness({ validator: val.email(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid email address"] }])
    })

    test("enums", async () => {
        expect(await harness({ validator: val.enums({ enums: ["lorem",  "ipsum"] }), type: String, testValue: "lorems" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Value must be one of lorem, ipsum"] }])
    })

    test("fQDN", async () => {
        expect(await harness({ validator: val.fqdn(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid FQDN"] }])
    })

    test("float", async () => {
        expect(await harness({ validator: val.float(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid float number"] }])
    })

    test("fullWidth", async () => {
        expect(await harness({ validator: val.fullWidth(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid value provided"] }])
    })

    test("halfWidth", async () => {
        expect(await harness({ validator: val.halfWidth(), type: String, testValue: "あいうえお" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid value provided"] }])
    })

    test("hash", async () => {
        expect(await harness({ validator: val.hash({ algorithm: "md5" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid hash"] }])
    })

    test("hexColor", async () => {
        expect(await harness({ validator: val.hexColor(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid hex color"] }])
    })

    test("hexadecimal", async () => {
        expect(await harness({ validator: val.hexadecimal(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid hexadecimal"] }])
    })

    test("iP", async () => {
        expect(await harness({ validator: val.ip(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid IP address"] }])
    })

    test("iSBN", async () => {
        expect(await harness({ validator: val.isbn(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid ISBN"] }])
    })

    test("iSIN", async () => {
        expect(await harness({ validator: val.isin(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid ISIN"] }])
    })

    test("iSO31661Alpha2", async () => {
        expect(await harness({ validator: val.iso31661Alpha2(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid ISO 31661 Alpha 2"] }])
    })

    test("iSO8601", async () => {
        expect(await harness({ validator: val.iso8601(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid ISO 8601 date"] }])
    })

    test("iSRC", async () => {
        expect(await harness({ validator: val.isrc(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid ISRC"] }])
    })

    test("iSSN", async () => {
        expect(await harness({ validator: val.issn(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid ISSN"] }])
    })

    test("int", async () => {
        expect(await harness({ validator: val.int(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid integer"] }])
    })

    test("jSON", async () => {
        expect(await harness({ validator: val.json(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid JSON"] }])
    })

    test("latLong", async () => {
        expect(await harness({ validator: val.latLong(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid lat long"] }])
    })

    test("length", async () => {
        expect(await harness({ validator: val.length({ max: 10 }), type: String, testValue: "abc123-234fds" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid length"] }])
    })

    test("lowercase", async () => {
        expect(await harness({ validator: val.lowerCase(), type: String, testValue: "DSsafdsa" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid lower case"] }])
    })

    test("mACAddress", async () => {
        expect(await harness({ validator: val.macAddress(), type: String, testValue: "01:02:03:04:05" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid MAC address"] }])
    })

    test("matches", async () => {
        expect(await harness({ validator: val.matches({ pattern: "^[a-z0-9 ]+$" }), type: String, testValue: "the;hero" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid string"] }])
    })

    test("mD5", async () => {
        expect(await harness({ validator: val.md5(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid MD5 hash"] }])
    })

    test("mimeType", async () => {
        expect(await harness({ validator: val.mimeType(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid mime type"] }])
    })

    test("mobilePhone", async () => {
        expect(await harness({ validator: val.mobilePhone({ locale: "id-ID" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid mobile phone"] }])
    })

    test("mongoId", async () => {
        expect(await harness({ validator: val.mongoId(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid MongoDb id"] }])
    })

    test("multibyte", async () => {
        expect(await harness({ validator: val.multibyte(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid multi byte"] }])
    })

    test("numeric", async () => {
        expect(await harness({ validator: val.numeric(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid numeric"] }])
    })

    test("port", async () => {
        expect(await harness({ validator: val.port(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid port"] }])
    })

    test("postalCode", async () => {
        expect(await harness({ validator: val.postalCode({ locale: "ID" }), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid postal code"] }])
    })

    test("surrogatePair", async () => {
        expect(await harness({ validator: val.surrogatePair(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid surrogate pair"] }])
    })

    test("uRL", async () => {
        expect(await harness({ validator: val.url(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid url"] }])
    })

    test("uUID", async () => {
        expect(await harness({ validator: val.UUID(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid UUID"] }])
    })

    test("uppercase", async () => {
        expect(await harness({ validator: val.uppercase(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid uppercase"] }])
    })

    test("variableWidth", async () => {
        expect(await harness({ validator: val.variableWidth(), type: String, testValue: "abc123-234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid variable width"] }])
    })

    test("whitelisted", async () => {
        expect(await harness({ validator: val.whiteListed({ chars: 'abcdefghijklmnopqrstuvwxyz-' }), type: String, testValue: "abc123.234" }))
            .toMatchObject([{ path: ["data", "property"], messages: ["Invalid white listed"] }])
    })
})




