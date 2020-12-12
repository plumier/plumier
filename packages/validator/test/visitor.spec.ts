import reflect, { decorateProperty } from "@plumier/reflect"

import { convert } from "../src"
import { Result, VisitorInvocation } from '../src';

describe("Visitor", () => {

    const nameValue = (i: VisitorInvocation) => {
        const result = i.proceed()
        return Result.create({ name: i.path, result: result.value })
    }

    const getDecorators = (i: VisitorInvocation) => {
        const result = i.proceed()
        return Result.create({ decorators: i.decorators, value: result.value })
    }

    const olderThanEightTeen = (i: VisitorInvocation) => {
        if (i.type === Number && i.value < 18)
            return Result.error(i.value, i.path, "Must be older than 18")
        else
            return i.proceed()
    }

    it("Should be able to create result of multiple messages", () => {
        const result = Result.error(undefined, "path", ["Hello", "world"])
        expect(result).toMatchSnapshot()
    })

    it("Should convert value properly", () => {
        const result = convert("40", { type: Number, visitors: [olderThanEightTeen] })
        expect(result.value).toBe(40)
    })

    it("Should throw error properly", () => {
        expect(convert("12", { type: Number, visitors: [olderThanEightTeen] }))
            .toMatchSnapshot()
    })

    it("Should traverse through all object properties", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public age: number
            ) { }
        }
        expect(convert({ id: "12", name: "Mimi", age: "12" }, { type: AnimalClass, visitors: [olderThanEightTeen] }))
            .toMatchSnapshot()
    })

    it("Should traverse through nested object properties", () => {
        @reflect.parameterProperties()
        class Tag {
            constructor(public age: number) { }
        }
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public tag: Tag
            ) { }
        }
        expect(convert({ id: "12", name: "Mimi", tag: { age: "12" } }, { type: AnimalClass, visitors: [olderThanEightTeen] }))
            .toMatchSnapshot()
    })

    it("Should traverse through array", () => {
        @reflect.parameterProperties()
        class Tag {
            constructor(public age: number) { }
        }

        expect(convert([{ age: "12" }, { age: "40" }, { age: "12" }], { type: [Tag], visitors: [olderThanEightTeen] }))
            .toMatchSnapshot()
    })

    it("Should provide current traverse path", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
            ) { }
        }
        const result = convert({ id: "12", name: "Mimi" }, { type: AnimalClass, visitors: [nameValue] })
        expect(result.value).toMatchSnapshot()
    })

    it("Should provide current traverse name on array", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
            ) { }
        }
        const result = convert([{ id: "12" }, { id: "12" }], { type: [AnimalClass], visitors: [nameValue] })
        expect(result.value).toMatchSnapshot()
    })
})


describe("Multiple Visitors", () => {

    it("Should throw error properly", () => {
        const result = convert("123", {
            type: Number, visitors: [
                (i) => Result.create(i.proceed().value + 3),
                (i) => Result.create(i.proceed().value + 3),
            ]
        })
        expect(result.value).toBe(129)
    })
})

describe("Decorator distribution", () => {
    function myVisitor(i: VisitorInvocation): Result {
        return Result.create({ val: i.proceed().value, deco: i.decorators })
    }

    const option = { decorators: [{ type: "deco" }], visitors: [myVisitor] }

    it("Should received by primitive converter", () => {
        expect(convert("123", { ...option, type: Number }).value)
            .toMatchObject({ val: 123, deco: [{ type: "deco" }] })
    })

    it("Should received by class properties", () => {
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                @decorateProperty({ type: "name" })
                public name: string,
                @decorateProperty({ type: "age" })
                public age: number
            ) { }
        }
        expect(convert({ id: "12", name: "Mimi", age: "12" }, { ...option, type: AnimalClass }))
            .toMatchSnapshot()
    })

    it("Should received by class with nested properties", () => {
        @reflect.parameterProperties()
        class Tag {
            constructor(
                @decorateProperty({ type: "deco" })
                public age: number
            ) { }
        }
        @reflect.parameterProperties()
        class AnimalClass {
            constructor(
                public id: number,
                public name: string,
                public tag: Tag
            ) { }
        }
        expect(convert({ id: "12", name: "Mimi", tag: { age: "12" } }, { ...option, type: AnimalClass }))
            .toMatchSnapshot()
    })

    it("Should received by array item", () => {
        @reflect.parameterProperties()
        class Tag {
            constructor(
                @decorateProperty({ type: "deco" })
                public age: number) { }
        }

        expect(convert([{ age: "12" }, { age: "40" }, { age: "12" }], { ...option, type: [Tag] }))
            .toMatchSnapshot()
    })
})

describe("Parent Distribution", () => {

    function addParentTag(i: VisitorInvocation): Result {
        const result = i.proceed()
        return Result.create({ result: result.value, parent: i.parent })
    }

    it("Should add parent information", () => {
        @reflect.parameterProperties()
        class Tag {
            constructor(public age: number) { }
        }

        expect(convert({ age: "12" }, { type: Tag, visitors: [addParentTag] })).toMatchSnapshot()
    })

    it("Should add parent information with external decorators", () => {
        @reflect.parameterProperties()
        class Tag {
            constructor(public age: number) { }
        }

        expect(convert({ age: "12" }, { type: Tag, visitors: [addParentTag], decorators: [{ type: "deco" }] })).toMatchSnapshot()
    })

    it("Should add parent information on nested types", () => {
        @reflect.parameterProperties()
        class Tag {
            constructor(public age: number) { }
        }

        @reflect.parameterProperties()
        class Animal {
            constructor(
                @decorateProperty({ type: "deco" })
                public tag: Tag) { }
        }

        expect(convert({ tag: { age: "12" } }, { type: Animal, visitors: [addParentTag] })).toMatchSnapshot()
    })

    it("Should add parent information on nested types with array", () => {
        @reflect.parameterProperties()
        class Tag {
            constructor(public age: number) { }
        }

        @reflect.parameterProperties()
        class Animal {
            constructor(
                @decorateProperty({ type: "deco" })
                @reflect.type([Tag])
                public tag: Tag[]) { }
        }

        expect(convert({ tag: [{ age: "12" }, { age: "12" }] }, { type: Animal, visitors: [addParentTag] })).toMatchSnapshot()
    })
})