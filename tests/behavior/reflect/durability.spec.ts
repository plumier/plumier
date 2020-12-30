import reflect from "@plumier/reflect"
import { join } from "path"


describe("Durability", () => {
    it("Should not error parsing typescript", () => {
        reflect("typescript")
    })

    it("Should not throw stack overflow when traverse cross reference object", () => {
        const result = reflect(join(__dirname, "./mocks/cross-reference-object"))
        expect(result).toMatchSnapshot()
    })
})