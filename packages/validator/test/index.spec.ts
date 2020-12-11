describe("Index", () => {
    it("Should export member properly", () => {
        expect(require("../src")).toMatchSnapshot()
    })
})