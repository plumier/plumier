import createConverter from "@plumier/validator"

const convert = createConverter({ type: Boolean })

describe("Boolean Converter", () => {
    it("Should convert Trusty string to true", () => {
        const result = ["ON", "TRUE", "1", "YES", 1].map(x => convert(x))
        expect(result.every(x => x.value == true)).toEqual(true)
    })
    it("Should convert Falsy into false", () => {
        const result = ["OFF", "FALSE", "0", "NO", 0].map(x => convert(x))
        expect(result.every(x => x.value == false)).toEqual(true)
    })
    it("Should return undefined if provided null", () => {
        const result = convert(null)
        expect(result.value).toBeNull()
    })
    it("Should return undefined if provided undefined", () => {
        const result = convert(undefined)
        expect(result.value).toBeUndefined()
    })
    it("Should error when provided non convertible string", () => {
        const result = convert("Hello")
        expect(result.issues).toEqual([{ path: "", messages: [`Unable to convert "Hello" into Boolean`] }])
    })
    it("Should error when provided non convertible number", () => {
        const result = convert(200)
        expect(result.issues).toEqual([{ path: "", messages: [`Unable to convert "200" into Boolean`] }])
    })
})