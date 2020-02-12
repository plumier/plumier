import { splitName } from "@plumier/social-login"

describe("splitName", () => {
    it("Should split name with 4 words", () => {
        expect(splitName("I Ketut Sandiarsa Rugita")).toMatchSnapshot()
    })
    it("Should split name with 3 words", () => {
        expect(splitName("Ketut Sandiarsa Rugita")).toMatchSnapshot()
    })
    it("Should split name with 2 words", () => {
        expect(splitName("Ketut Sandiarsa")).toMatchSnapshot()
    })
    it("Should split name with 1 words", () => {
        expect(splitName("Ketut")).toMatchSnapshot()
    })
    it("Should not error when provided undefined", () => {
        expect(splitName(undefined)).toMatchSnapshot()
    })
})
