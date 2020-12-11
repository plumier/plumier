import { consoleLog, printTable, ellipsis, analyzeModel, domain, globAsync } from "@plumier/core"
import reflect from "@plumier/reflect"

describe("PrintTable", () => {
    it("Should able to print table", () => {
        const mock = consoleLog.startMock()
        printTable(["name", "age"], [
            { name: "John Subaru", age: 60 },
            { name: "John Subaru", age: 60 },
            { name: "John Subaru", age: 60 },
        ])
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should able to print table with algin right", () => {
        const mock = consoleLog.startMock()
        printTable(["name", { property: "age", align: "right" }], [
            { name: "John Subaru", age: 60 },
            { name: "John Subaru", age: 160 },
            { name: "John Subaru", age: 60 },
        ])
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })

    it("Should not error when provided undefined value", () => {
        const mock = consoleLog.startMock()
        printTable(["name", { property: "age", align: "right" }], [
            { name: "John Subaru", age: 60 },
            { name: "John Subaru" },
            { name: "John Subaru", age: 60 },
        ])
        expect(mock.mock.calls).toMatchSnapshot()
        consoleLog.clearMock()
    })
})

describe("Ellipsis", () => {
    it("Should trim long string", () => {
        const str = ellipsis("Lorem ipsum dolor sit amet lorem ipsum dolor", 20)
        expect(str.length).toBe(20)
        expect(str).toMatchSnapshot()
    })
    it("Should not trim string if shorter than expected", () => {
        const str = ellipsis("Lorem", 20)
        expect(str.length).toBe(str.length)
        expect(str).toMatchSnapshot()
    })
})

describe("Model Analyser", () => {
    it("Should analyze missing properties", () => {
        class MyModel {
            constructor(
                public name: string,
                public date: Date
            ) { }
        }
        expect(analyzeModel(MyModel)).toMatchSnapshot()
    })
    it("Should analyze missing property type", () => {
        @domain()
        class MyModel {
            constructor(
                public name: string,
                public date: Readonly<Date>
            ) { }
        }
        expect(analyzeModel(MyModel)).toMatchSnapshot()
    })
    it("Should analyze missing array type", () => {
        @domain()
        class MyModel {
            constructor(
                public name: string,
                public dates: Date[]
            ) { }
        }
        expect(analyzeModel(MyModel)).toMatchSnapshot()
    })
    it("Should analyze missing property type in nested model", () => {
        @domain()
        class ParentModel {
            constructor(
                public name: string,
                public date: Readonly<Date>
            ) { }
        }
        @domain()
        class MyModel {
            constructor(
                public parent: ParentModel
            ) { }
        }
        expect(analyzeModel(MyModel)).toMatchSnapshot()
    })
    it("Should analyze missing property in array type", () => {
        @domain()
        class MyModel {
            constructor(
                public name: string,
                public date: Readonly<Date>
            ) { }
        }
        expect(analyzeModel([MyModel])).toMatchSnapshot()
    })
    it("Should analyze missing property type in nested array model", () => {
        @domain()
        class ParentModel {
            constructor(
                public name: string,
                public date: Readonly<Date>
            ) { }
        }
        @domain()
        class MyModel {
            constructor(
                @reflect.type([ParentModel])
                public parent: ParentModel[]
            ) { }
        }
        expect(analyzeModel(MyModel)).toMatchSnapshot()
    })
    it("Should skip cross reference type", () => {
        @domain()
        class ParentModel {
            constructor(
                public name: string,
                public date: Readonly<Date>,
                @reflect.type(x => [MyModel])
                public children: MyModel[]
            ) { }
        }
        @domain()
        class MyModel {
            constructor(
                @reflect.type([ParentModel])
                public parent: ParentModel[]
            ) { }
        }
        expect(analyzeModel(MyModel)).toMatchSnapshot()
    })
})
