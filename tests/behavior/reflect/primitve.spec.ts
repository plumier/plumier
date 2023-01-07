import reflect from "@plumier/reflect"

/*
THIS TEST REQUIRED  NODE.JS 10
*/
describe("Primitive Class", () => {
    it("Should inspect Boolean", () => {
        const meta = reflect(Boolean)
        expect(meta.kind).toBe("Class")
        expect(meta.name).toBe("Boolean")
    })
    it("Should inspect String", () => {
        const meta = reflect(String)
        expect(meta.kind).toBe("Class")
        expect(meta.name).toBe("String")
    })
    it("Should inspect Number", () => {
        const meta = reflect(Number)
        expect(meta.kind).toBe("Class")
        expect(meta.name).toBe("Number")
    })
    it("Should inspect Date", () => {
        const meta = reflect(Date)
        expect(meta.kind).toBe("Class")
        expect(meta.name).toBe("Date")
    })
    it("Should inspect Array", () => {
        const meta = reflect(Array)
        expect(meta.kind).toBe("Class")
        expect(meta.name).toBe("Array")
    })
    it("Should inspect Promise", () => {
        const meta = reflect(Promise)
        expect(meta.kind).toBe("Class")
        expect(meta.name).toBe("Promise")
    })
    it("Should inspect Object", () => {
        const meta = reflect(Object)
        expect(meta.kind).toBe("Class")
        expect(meta.name).toBe("Object")
    })
})