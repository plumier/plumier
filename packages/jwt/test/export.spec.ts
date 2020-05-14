
describe("Module Export", () => {
    it("Should export module properly", () => {
        const mod = require("../src")
        expect(mod).toMatchSnapshot()
    })
})