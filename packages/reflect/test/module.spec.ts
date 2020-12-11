import { join } from "path"

import { reflect } from "../src"
import { MyClass } from "./mocks/mock.class"
import { myNameSpace } from "./mocks/mock.class-in-namespace"


describe("Module Introspection", () => {
    it("Should inspect function", async () => {
        const meta = await reflect(join(__dirname, "./mocks/mock.function"))
        expect(meta.members[0]).toMatchSnapshot()
    })

    it("Should inspect function inside namespace", async () => {
        const meta = await reflect(join(__dirname, "./mocks/mock.function-in-namespace"))
        expect(meta.members[0]).toMatchSnapshot()
    })

    it("Should inspect class", async () => {
        const meta = await reflect(join(__dirname, "./mocks/mock.class"))
        expect(meta.members[0]).toMatchSnapshot()
    })

    it("Should inspect class inside namespace", async () => {
        const meta = await reflect(join(__dirname, "./mocks/mock.class-in-namespace"))
        expect(meta.members[0]).toMatchSnapshot()
    })

    it("Should inspect module with constant", async () => {
        const meta = await reflect(join(__dirname, "./mocks/mock.module-with-value"))
        expect(meta.members.length).toBe(1)
        expect(meta.members[0]).toMatchSnapshot()
    })

    it("Should inspect module with enum", async () => {
        const meta = await reflect(join(__dirname, "./mocks/mock.module-with-enum"))
        expect(meta.members.length).toBe(2)
        expect(meta.members[0]).toMatchSnapshot()
    })
})