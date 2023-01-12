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

    it("Should able to reflect function inside object", () => {
        const obj = {
            fn(par1: string) { }
        }
        const meta = reflect(obj.fn)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to reflect async function inside object", () => {
        const obj = {
            async fn(par1: string) { }
        }
        const meta = reflect(obj.fn)
        expect(meta).toMatchSnapshot()
    })


    it("Should able to reflect function property inside object", () => {
        const obj = {
            fn: function (par1: string) { }
        }
        const meta = reflect(obj.fn)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to reflect async function property inside object", () => {
        const obj = {
            fn: async function (par1: string) { }
        }
        const meta = reflect(obj.fn)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to reflect lambda function inside object", () => {
        const obj = {
            fn: (par1: number) => {
                return par1
            },
        };
        const metadata = reflect(obj.fn);
        expect(metadata).toMatchSnapshot()
    })

    it("Should able to reflect lambda function inside object", () => {
        const obj = {
            fn: async (par1: number) => {
                return par1
            },
        };
        const metadata = reflect(obj.fn);
        expect(metadata).toMatchSnapshot()
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