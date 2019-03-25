import { getChildValue } from "@plumier/core";

describe("getChildProperty", () => {
    it("Should able to get nested child property value", () => {
        const result = getChildValue({ a: { b: { c: "Hello" } } }, "a.b")
        expect(result).toEqual({c: "Hello"})
    })
    it("Should able to get nested child property value", () => {
        const result = getChildValue({ a: { b: { c: "Hello" } } }, "a.b.c")
        expect(result).toBe("Hello")
    })
    it("Should able to access array", () => {
        const result = getChildValue({ a: [true, "Hello", 2] }, "a[1]")
        expect(result).toBe("Hello")
    })
    it("Should work with falsy value", () => {
        const result = getChildValue({ a: [false] }, "a[0]")
        expect(result).toBe(false)
    })
    it("Should able to access array", () => {
        const result = getChildValue([1, 2, 3], "[0]")
        expect(result).toBe(1)
    })
    it("Should return undefined if property not match", () => {
        const result = getChildValue({ a: { b: { c: "Hello" } } }, "a.d.e.f.g[0]")
        expect(result).toBeUndefined()
    })
})
