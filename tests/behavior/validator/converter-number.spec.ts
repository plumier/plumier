import createConverter from "@plumier/validator"

const convert = createConverter({ type: Number })

describe("Number Converter", () => {

    it("Should convert number", () => {
        const result = convert("123")
        expect(result.value).toBe(123)
    })
    it("Should convert float", () => {
        const result = convert("123.123")
        expect(result.value).toBe(123.123)
    })
    it("Should convert negative", () => {
        const result = convert("-123")
        expect(result.value).toBe(-123)
    })
    it("Should convert negative float", () => {
        const result = convert("-123.123")
        expect(result.value).toBe(-123.123)
    })
    it("Should return undefined if provided null", () => {
        const result = convert(null)
        expect(result.value).toBeNull()
    })
    it("Should return undefined if provided undefined", () => {
        const result = convert(undefined)
        expect(result.value).toBeUndefined()
    })
    it("Should validate if provided empty string", () => {
        const result = convert("")
        expect(result.issues).toEqual([{ path: "", messages: [`Unable to convert "" into Number`] }])
    })
    it("Should not convert string", () => {
        const result = convert("Hello")
        expect(result.issues).toEqual([{ path: "", messages: [`Unable to convert "Hello" into Number`] }])
    })
})
