import { RouteGenerator } from "@plumier/kernel";

describe("striveController", () => {
    it("Should strive at the end", () => {
        const result = RouteGenerator.striveController("AnimalController")
        expect(result).toEqual("animal")
    })

    it("Should not strive at the middle", () => {
        const result = RouteGenerator.striveController("AnimalControllerAnimalController")
        expect(result).toEqual("animalcontrolleranimal")
    })

    it("Should not strive at the front", () => {
        const result = RouteGenerator.striveController("ControllerAnimalController")
        expect(result).toEqual("controlleranimal")
    })
})

