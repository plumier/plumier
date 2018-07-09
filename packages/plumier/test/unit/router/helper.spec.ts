import { striveController } from "../../../src/router";

describe("striveController", () => {
    it("Should strive at the end", () => {
        const result = striveController("AnimalController")
        expect(result).toEqual("animal")
    })

    it("Should not strive at the middle", () => {
        const result = striveController("AnimalControllerAnimalController")
        expect(result).toEqual("animalcontrolleranimal")
    })

    it("Should not strive at the front", () => {
        const result = striveController("ControllerAnimalController")
        expect(result).toEqual("controlleranimal")
    })
})

