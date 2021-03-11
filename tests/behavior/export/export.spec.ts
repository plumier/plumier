describe("Export", () => {
    it("Should export @plumier/core", () => {
        expect(require("@plumier/core")).toMatchSnapshot()
    })
    it("Should export @plumier/filter-parser", () => {
        expect(require("@plumier/filter-parser")).toMatchSnapshot()
    })
    it("Should export @plumier/generic-controller", () => {
        expect(require("@plumier/generic-controller")).toMatchSnapshot()
    })
    it("Should export @plumier/jwt", () => {
        expect(require("@plumier/jwt")).toMatchSnapshot()
    })
    it("Should export @plumier/mongoose", () => {
        expect(require("@plumier/mongoose")).toMatchSnapshot()
    })
    it("Should export plumier", () => {
        expect(require("plumier")).toMatchSnapshot()
    })
    it("Should export @plumier/reflect", () => {
        expect(require("@plumier/reflect")).toMatchSnapshot()
    })
    it("Should export @plumier/serve-static", () => {
        expect(require("@plumier/serve-static")).toMatchSnapshot()
    })
    it("Should export @plumier/social-login", () => {
        expect(require("@plumier/social-login")).toMatchSnapshot()
    })
    it("Should export @plumier/swagger", () => {
        expect(require("@plumier/swagger")).toMatchSnapshot()
    })
    it("Should export @plumier/testing", () => {
        expect(require("@plumier/testing")).toMatchSnapshot()
    })
    it("Should export @plumier/typeorm", () => {
        expect(require("@plumier/typeorm")).toMatchSnapshot()
    })
    it("Should export @plumier/validator", () => {
        expect(require("@plumier/validator")).toMatchSnapshot()
    })
})