import { decorate } from "@plumier/reflect"
import { parser as metadata } from "@plumier/reflect"

function globalFunction(a: any, b: any) {

}

describe("Constructor parameter", () => {
    it("Should get constructor parameter name", () => {
        class DummyClass {
            constructor(
                par1: string,
                par2: string,
                par3: string,
                par4: string
            ) {
                globalFunction(par1, par2)
            }
        }
        const result = metadata.getConstructorParameters(DummyClass)
        expect(result).toMatchSnapshot()
    })

    it("Should get constructor parameter name with comment", () => {
        class DummyClass {
            constructor(
                /* this is comment */
                par1: string,
                /* this is comment () */
                par2: string,
                par3: string,
                /* this is comment {} */
                par4: string
            ) {
                globalFunction(par1, par2)
            }
        }
        const result = metadata.getConstructorParameters(DummyClass)
        expect(result).toMatchSnapshot()
    })

    it("Should get constructor with default parameter", () => {
        class DummyClass {
            constructor(
                par1 = "Halo",
                par2 = 123,
                par3 = new Date(),
                par4 = false
            ) {
                globalFunction(par1, par2)
            }
        }
        const result = metadata.getConstructorParameters(DummyClass)
        expect(result).toMatchSnapshot()
    })

    it("Should reflect rest parameter", () => {
        class DummyClass {
            constructor(...pars: any[]) { }
        }
        const result = metadata.getConstructorParameters(DummyClass)
        expect(result).toMatchSnapshot()
    })

    it("Should return empty array when no constructor provided", () => {
        class DummyClass {
            @decorate({})
            myProp = 1;
            @decorate({})
            myFunction(
                @decorate({}) par: string
            ) { }
        }
        const result = metadata.getConstructorParameters(DummyClass)
        expect(result).toMatchSnapshot()
    })

})

describe("Method Parameters", () => {
    it("Should get method parameter name", () => {
        class DummyClass {
            myMethod(
                par1: string,
                par2: string,
                par3: string,
                par4: string
            ) {
                globalFunction(par1, par2)
            }
        }
        const result = metadata.getMethodParameters(DummyClass, "myMethod")
        expect(result).toMatchSnapshot()
    })

    it("Should get method parameter name with comment", () => {
        class DummyClass {
            myMethod(
                /* this is comment */
                par1: string,
                /* this is comment () */
                par2: string,
                par3: string,
                /* this is comment {} */
                par4: string
            ) {
                globalFunction(par1, par2)
            }
        }
        const result = metadata.getMethodParameters(DummyClass, "myMethod")
        expect(result).toMatchSnapshot()
    })

    it("Should get method parameter with default parameter", () => {
        class DummyClass {
            myMethod(
                par1 = "Halo",
                par2 = 123,
                par3 = new Date(),
                par4 = false
            ) {
                globalFunction(par1, par2)
            }
        }
        const result = metadata.getMethodParameters(DummyClass, "myMethod")
        expect(result).toMatchSnapshot()
    })
})

describe("Function Parameters", () => {
    it("Should get function parameter name", () => {
        function myFunction(
            par1: string,
            par2: string,
            par3: string,
            par4: string
        ) {
            globalFunction(par1, par2)
        }
        const result = metadata.getFunctionParameters(myFunction)
        expect(result).toMatchSnapshot()
    })

    it("Should get function parameter name with comment", () => {
        function myFunction(
            /* this is comment */
            par1: string,
            /* this is comment () */
            par2: string,
            par3: string,
            /* this is comment {} */
            par4: string
        ) {
            globalFunction(par1, par2)
        }
        const result = metadata.getFunctionParameters(myFunction)
        expect(result).toMatchSnapshot()
    })

    it("Should get function parameter with default parameter", () => {
        function myFunction(
            par1 = "Halo",
            par2 = 123,
            par3 = new Date(),
            par4 = false
        ) {
            globalFunction(par1, par2)
        }
        const result = metadata.getFunctionParameters(myFunction)
        expect(result).toMatchSnapshot()
    })
})

describe("Durability", () => {
    it("getParameterNames should not error when provided proxy", () => {
        function MyFunction() { }
        MyFunction.toString = () => {
            return "[Function]"
        }
        const result = metadata.getFunctionParameters(MyFunction)
        expect(result).toMatchSnapshot()
    })

    it("getConstructorParameters should not error when provided proxy", () => {
        class MyFunction {
            constructor() { }
        }
        MyFunction.toString = () => {
            return "[Function]"
        }
        const result = metadata.getConstructorParameters(MyFunction)
        expect(result).toMatchSnapshot()
    })

    it("getMethodParameters should not error when provided proxy", () => {
        class MyFunction {
            constructor() { }
            myMethod() { }
        }
        MyFunction.toString = () => {
            return "[Function]"
        }
        const result = metadata.getMethodParameters(MyFunction, "myMethod")
        expect(result).toMatchSnapshot()
    })

    it("Should not error when provided function without parameter", () => {
        function myFun() { }
        const result = metadata.getFunctionParameters(myFun)
        expect(result).toMatchSnapshot()
    })

    it("Should not error when provided method without parameter", () => {
        class MyClass {
            myMethod() { }
        }
        const result = metadata.getMethodParameters(MyClass, "myMethod")
        expect(result).toMatchSnapshot()
    })

    it("Should not error when provided constructor without parameter", () => {
        class MyClass {
            constructor() { }
        }
        const result = metadata.getConstructorParameters(MyClass)
        expect(result).toMatchSnapshot()
    })

    it("Should not error when provided default constructor", () => {
        class MyClass {
        }
        const result = metadata.getConstructorParameters(MyClass)
        expect(result).toMatchSnapshot()
    })

    it("Should not error when provided method first than constructor", () => {
        class MyClass {
            myMethod() { }
            constructor() { }
        }
        const result = metadata.getConstructorParameters(MyClass)
        expect(result).toMatchSnapshot()
    })
})

describe("Parameter Destructuring", () => {
    it("Should parse parameter destructuring", () => {
        interface MyModel {
            date: Date
            num: number
        }
        function myFun(par: string, { date, num }: MyModel) { }
        const result = metadata.getFunctionParameters(myFun)
        expect(result).toMatchSnapshot()
    })

    it("Should parse parameter destructuring with custom name", () => {
        interface MyModel {
            date: Date
            num: number
        }
        function myFun({ date: tanggal, num }: MyModel) { }
        const result = metadata.getFunctionParameters(myFun)
        expect(result).toMatchSnapshot()
    })

    it("Should parse parameter destructuring with nested property", () => {
        interface MyModel {
            date: Date
            num: number,
            inner: InnerModel
        }
        interface InnerModel {
            str: string
            dob: Date
        }
        function myFun(par: string, { date: tanggal, num, inner: { str, dob: dateOfBirth } }: MyModel) { }
        const result = metadata.getFunctionParameters(myFun)
        expect(result).toMatchSnapshot()
    })

    it("Should parse parameter destructuring on constructor", () => {
        interface MyModel {
            date: Date
            num: number
        }
        class MyClass {
            constructor({ date: tanggal, num }: MyModel) { }
        }
        const result = metadata.getConstructorParameters(MyClass)
        expect(result).toMatchSnapshot()
    })

    it("Should parse parameter destructuring on method", () => {
        interface MyModel {
            date: Date
            num: number
        }
        class MyClass {
            myMethod({ date: tanggal, num }: MyModel) { }
        }
        const result = metadata.getMethodParameters(MyClass, "myMethod")
        expect(result).toMatchSnapshot()
    })
})