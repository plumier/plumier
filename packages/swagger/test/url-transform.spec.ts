import { transformUrl } from "@plumier/swagger"

describe("Url Transformer", () => {
    it("Should transform url parameter properly", () => {
        expect(transformUrl("/animals/:animalId"))
            .toBe("/animals/{animalId}")
    })

    it("Should transform nested url parameter properly", () => {
        expect(transformUrl("/animals/:animalId/owners/:id"))
            .toBe("/animals/{animalId}/owners/{id}")
    })

    it("Should detect separation with hyphen", () => {
        expect(transformUrl("/animals/:animalId-owners"))
            .toBe("/animals/{animalId}-owners")
    })
})