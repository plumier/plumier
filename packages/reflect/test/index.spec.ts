
describe("Exported", () => {
    it("Should export members", () => {
        expect(require("../src")).toMatchSnapshot()
    })
})