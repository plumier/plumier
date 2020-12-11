import createConverter from "../src"

const convert = createConverter({ type: String })

describe("String Converter", () => {

    it("Should convert string", () => {
        const result = convert("123")
        expect(result.value).toBe("123")
    })

    it("Should convert number", () => {
        const result = convert(123)
        expect(result.value).toBe("123")
    })

    it("Should convert boolean", () => {
        const result = convert(false)
        expect(result.value).toBe("false")
    })
})
