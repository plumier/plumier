import { DecoratorId, DecoratorOptionId } from "../src"
import * as metadata from "../src/metadata"

describe("Metadata", () => {
    describe("Class", () => {
        it("Should able to add metadata", () => {
            class Animal { }
            metadata.setMetadata({ cache: 123 }, Animal)
            const meta = metadata.getMetadata(Animal)
            expect(meta).toMatchSnapshot()
        })
        it("Should able to add multiple metadata", () => {
            class Animal { }
            metadata.setMetadata({ cache: 123 }, Animal)
            metadata.setMetadata({ cache: 456 }, Animal)
            const meta = metadata.getMetadata(Animal)
            expect(meta).toMatchSnapshot()
        })
        it("Should inherit metadata by default", () => {
            class Animal { }
            class Duck extends Animal { }
            class Chicken extends Animal { }
            metadata.setMetadata({ cache: 123 }, Animal)
            metadata.setMetadata({ cache: 456 }, Duck)
            metadata.setMetadata({ cache: 789 }, Chicken)
            expect(metadata.getMetadata(Animal)).toMatchSnapshot()
            expect(metadata.getMetadata(Duck)).toMatchSnapshot()
            expect(metadata.getMetadata(Chicken)).toMatchSnapshot()
        })
        it("Should able to skip inheritability", () => {
            class Animal { }
            class Duck extends Animal { }
            metadata.setMetadata({ cache: 123, [DecoratorOptionId]: { inherit: false } }, Animal,)
            metadata.setMetadata({ cache: 456 }, Duck)
            expect(metadata.getMetadata(Animal)).toMatchSnapshot()
            expect(metadata.getMetadata(Duck)).toMatchSnapshot()
        })
        it("Should able to replace parent metadata with allowMultiple:false", () => {
            class Animal { }
            class Duck extends Animal { }
            metadata.setMetadata({ cache: 123, [DecoratorId]: "lorem", [DecoratorOptionId]: { allowMultiple: false } }, Animal,)
            metadata.setMetadata({ cache: 456, [DecoratorId]: "lorem", [DecoratorOptionId]: { allowMultiple: false } }, Duck)
            expect(metadata.getMetadata(Animal)).toMatchSnapshot()
            expect(metadata.getMetadata(Duck)).toMatchSnapshot()
        })
    })
    describe("Property/Method", () => {
        it("Should able to add metadata", () => {
            class Animal {
                data: string = ""
            }
            metadata.setMetadata({ cache: 123 }, Animal, "data")
            const meta = metadata.getMetadata(Animal, "data")
            expect(meta).toMatchSnapshot()
        })
        it("Should able to add multiple metadata", () => {
            class Animal {
                data: string = ""
            }
            metadata.setMetadata({ cache: 123 }, Animal, "data")
            metadata.setMetadata({ cache: 123 }, Animal, "data")
            metadata.setMetadata({ cache: 456 }, Animal, "data")
            const meta = metadata.getMetadata(Animal, "data")
            expect(meta).toMatchSnapshot()
        })
        it("Should inherit metadata by default", () => {
            class Animal {
                data: string = ""
            }
            class Duck extends Animal { }
            class Dog extends Animal { }
            metadata.setMetadata({ cache: 123 }, Animal, "data")
            metadata.setMetadata({ cache: 456 }, Duck, "data")
            metadata.setMetadata({ cache: 789 }, Dog, "data")
            expect(metadata.getMetadata(Animal, "data")).toMatchSnapshot()
            expect(metadata.getMetadata(Duck, "data")).toMatchSnapshot()
            expect(metadata.getMetadata(Dog, "data")).toMatchSnapshot()
        })
        it("Should able to skip inheritability", () => {
            class Animal {
                data: string = ""
            }
            class Duck extends Animal { }
            metadata.setMetadata({ cache: 123, [DecoratorOptionId]: { inherit: false } }, Animal, "data")
            metadata.setMetadata({ cache: 456 }, Duck, "data")
            expect(metadata.getMetadata(Animal, "data")).toMatchSnapshot()
            expect(metadata.getMetadata(Duck, "data")).toMatchSnapshot()
        })
        it("Should able to replace parent metadata with allowMultiple:false", () => {
            class Animal {
                data: string = ""
            }
            class Duck extends Animal { }
            class Dog extends Animal { }
            metadata.setMetadata({ cache: 123, [DecoratorId]: "lorem", [DecoratorOptionId]: { allowMultiple: false } }, Animal, "data")
            metadata.setMetadata({ cache: 456, [DecoratorId]: "lorem", [DecoratorOptionId]: { allowMultiple: false } }, Duck, "data")
            expect(metadata.getMetadata(Animal, "data")).toMatchSnapshot()
            expect(metadata.getMetadata(Duck, "data")).toMatchSnapshot()
            expect(metadata.getMetadata(Dog, "data")).toMatchSnapshot()
        })
    })
    describe("Parameter", () => {
        it("Should able to add metadata", () => {
            class Animal {
                data(offset: string) { }
            }
            metadata.setMetadata({ cache: 123 }, Animal, "data", 0)
            const meta = metadata.getMetadata(Animal, "data", 0)
            expect(meta).toMatchSnapshot()
        })
        it("Should able to add multiple metadata", () => {
            class Animal {
                data(offset: string, limit: string) { }
            }
            metadata.setMetadata({ cache: 123 }, Animal, "data", 0)
            metadata.setMetadata({ cache: 123 }, Animal, "data", 0)
            metadata.setMetadata({ cache: 456 }, Animal, "data", 1)
            expect(metadata.getMetadata(Animal, "data", 0)).toMatchSnapshot()
            expect(metadata.getMetadata(Animal, "data", 1)).toMatchSnapshot()
        })
        it("Should inherit metadata by default", () => {
            class Animal {
                data(offset: string) { }
            }
            class Duck extends Animal { }
            class Dog extends Animal { }
            metadata.setMetadata({ cache: 123 }, Animal, "data", 0)
            metadata.setMetadata({ cache: 456 }, Duck, "data", 0)
            metadata.setMetadata({ cache: 789 }, Dog, "data", 0)
            expect(metadata.getMetadata(Animal, "data", 0)).toMatchSnapshot()
            expect(metadata.getMetadata(Duck, "data", 0)).toMatchSnapshot()
            expect(metadata.getMetadata(Dog, "data", 0)).toMatchSnapshot()
        })
        it("Should able to skip inheritability", () => {
            class Animal {
                data(offset: string) { }
            }
            class Duck extends Animal { }
            metadata.setMetadata({ cache: 123, [DecoratorOptionId]: { inherit: false } }, Animal, "data", 0)
            metadata.setMetadata({ cache: 456 }, Duck, "data", 0)
            expect(metadata.getMetadata(Animal, "data", 0)).toMatchSnapshot()
            expect(metadata.getMetadata(Duck, "data", 0)).toMatchSnapshot()
        })
        it("Should able to replace parent metadata with allowMultiple:false", () => {
            class Animal {
                data(offset: string) { }
            }
            class Duck extends Animal { }
            class Dog extends Animal { }
            metadata.setMetadata({ cache: 123, [DecoratorId]: "lorem", [DecoratorOptionId]: { allowMultiple: false } }, Animal, "data", 0)
            metadata.setMetadata({ cache: 456, [DecoratorId]: "lorem", [DecoratorOptionId]: { allowMultiple: false } }, Duck, "data", 0)
            expect(metadata.getMetadata(Animal, "data", 0)).toMatchSnapshot()
            expect(metadata.getMetadata(Duck, "data", 0)).toMatchSnapshot()
            expect(metadata.getMetadata(Dog, "data", 0)).toMatchSnapshot()
        })
    })
})