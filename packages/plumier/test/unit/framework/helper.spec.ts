import "../../../src/core"

describe("StringUtil.format", () => {
    it("Should assigned value properly", () => {
        const result = "One: {0}, Two: {1}, Three: {2}".format(1, 2, 3)
        expect(result).toBe("One: 1, Two: 2, Three: 3")
    })

    it("Should not assigned if the index is not specified", () => {
        const result = "One: {0}, Three: {2}".format(1, 2, 3)
        expect(result).toBe("One: 1, Three: 3")
    })

    it("Should keep the template if value not provided", () => {
        const result = "One: {0}, Two: {1}, Three: {2}, Four: {3}".format(1, 2, 3)
        expect(result).toBe("One: 1, Two: 2, Three: 3, Four: {3}")
    })
})
