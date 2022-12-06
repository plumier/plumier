import reflect from "@plumier/reflect"


describe("Reflect function", () => {
    it("Should reflect function", () => {
        function myFunction() { }
        const meta = reflect(myFunction)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to reflect function parameter names", () => {
        function myFunction(par1: number, par2: number) { }
        const meta = reflect(myFunction)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to reflect destructured parameter", () => {
        interface Parameter { prop1: number, prop2: number }
        function myFunction({ prop1, prop2 }: Parameter) { }
        const meta = reflect(myFunction)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to reflect rest parameter", () => {
        function myFunction(par1: number, ...par2: number[]) { }
        const meta = reflect(myFunction)
        expect(meta).toMatchSnapshot()
    })
})

describe("Reflect lambda function", () => {
    it("Should reflect function", () => {
        const myFunction = () => { }
        const meta = reflect(myFunction)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to reflect function parameter names", () => {
        const myFunction = (par1: number, par2: number) => { }
        const meta = reflect(myFunction)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to reflect destructured parameter", () => {
        interface Parameter { prop1: number, prop2: number }
        const myFunction = ({ prop1, prop2 }: Parameter) => { }
        const meta = reflect(myFunction)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to reflect rest parameter", () => {
        const myFunction = (par1: number, ...par2: number[]) => { }
        const meta = reflect(myFunction)
        expect(meta).toMatchSnapshot()
    })
})