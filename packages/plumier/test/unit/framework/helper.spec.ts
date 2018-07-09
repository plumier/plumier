import { StringUtil } from "../../../src/framework";


describe("StringUtil.format", () => {
    it("Should assigned value properly", () => {
        const result = StringUtil.format("One: {0}, Two: {1}, Three: {2}", 1, 2, 3)
        expect(result).toBe("One: 1, Two: 2, Three: 3")
    })

    it("Should not assigned if the index is not specified", () => {
        const result = StringUtil.format("One: {0}, Three: {2}", 1, 2, 3)
        expect(result).toBe("One: 1, Three: 3")
    })

    it("Should keep the template if value not provided", () => {
        const result = StringUtil.format("One: {0}, Two: {1}, Three: {2}, Four: {3}", 1, 2, 3)
        expect(result).toBe("One: 1, Two: 2, Three: 3, Four: {3}")
    })
})

describe("StringUtil.padRight", () => {
    it("Should pad to the right", () => {
        const result = StringUtil.padRight("1234", 8)
        expect(result).toBe("1234    ")
    })
})