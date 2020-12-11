import reflect from "../src";


describe("Private Decorator", () => {
    it("Should be able to ignore get set", () => {
        class DummyClass {
            @reflect.ignore()
            get data() { return 1 }
        }
        
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should be able to ignore method", () => {
        class DummyClass {
            @reflect.ignore()
            data() { return 1 }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should be able to ignore parameter properties", () => {
        @reflect.parameterProperties()
        class DummyClass {
            constructor(public data:string, @reflect.ignore() public id:string){}
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })
})