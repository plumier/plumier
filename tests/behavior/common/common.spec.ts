import { consoleLog, printTable } from "@plumier/core"

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



