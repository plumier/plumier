import reflect, { generic, type, parameterProperties, reflection, DecoratorOptionId, DecoratorId, noop } from "@plumier/reflect"



describe("Generic", () => {
    it("Should able to inspect generic type on method", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type("T")
            method(): T { return {} as any }
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect generic on method parameter", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            method(@type("T") par: T) { return {} as any }
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect generic on property", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type("T")
            prop: T = {} as any
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect generic on getter", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type("T")
            get prop(): T { return {} as any }
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect generic on parameter properties", () => {
        @generic.parameter("T")
        @parameterProperties()
        class SuperClass<T> {
            constructor(@type("T") public prop: T) { }
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should not error inspect the generic class", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            constructor(@type("T") par: T) { }
        }
        expect(reflect(SuperClass)).toMatchSnapshot()
    })
    it("Should able to inspect properties on deep inheritance", () => {
        @generic.parameter("T")
        class Grand<T> {
            @type("T")
            grand: T = {} as any
        }
        @generic.parameter("B")
        @generic.argument(Number)
        class Super<B> extends Grand<Number> {
            @type("B")
            super: B = {} as any
        }
        @generic.argument(String)
        class MyClass extends Super<String> { }
        const meta = reflect(MyClass)
        expect(reflection.getProperties(meta)).toMatchSnapshot()
        expect(meta).toMatchSnapshot()
    })
    it("Should able to inspect inherited generic type", () => {
        @generic.parameter("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            str(@type("U") bool: U): T { return {} as any }
        }
        @generic.parameter("T", "U")
        @generic.argument(String, Boolean)
        class SuperClass<T, U> extends GrandSuperClass<string, Boolean>{
            @type("T")
            num(@type("U") date: U): T { return {} as any }
        }
        @generic.argument(Number, Date)
        class MyClass extends SuperClass<number, Date>{ }
        const meta = reflect(MyClass)
        expect(reflection.getMethods(meta)).toMatchSnapshot()
        expect(meta).toMatchSnapshot()
    })
    it("Should able to inspect nested generic class with multiple template", () => {
        @generic.parameter("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            grandSuper(@type("U") par: U): T { return {} as any }
        }
        @generic.parameter("A", "B")
        @generic.argument("A", "B")
        class SuperClass<A, B> extends GrandSuperClass<A, B>{
            @type("B")
            super(@type("A") par: A): B { return {} as any }
        }
        @generic.argument(Number, Date)
        class MyClass extends SuperClass<number, Date>{ }
        const meta = reflect(MyClass)
        expect(reflection.getMethods(meta)).toMatchSnapshot()
        expect(meta).toMatchSnapshot()
    })
    it("Should inherit generic data type when overridden", () => {
        @generic.parameter("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            grandSuper(@type("U") par: U): T { return {} as any }
        }
        @generic.parameter("T", "U")
        @generic.argument("T", "U")
        class SuperClass<A, B> extends GrandSuperClass<A, B>{
            grandSuper(pur: B): A { return {} as any }
        }
        @generic.argument(Number, Date)
        class MyClass extends SuperClass<number, Date>{ }
        const meta = reflect(MyClass)
        expect(reflection.getMethods(meta)).toMatchSnapshot()
        expect(meta).toMatchSnapshot()
    })
    it("Should able to inspect generic type on inheritance when generic type parameter stop", () => {
        @generic.parameter("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            str(@type("U") bool: U): T { return {} as any }
        }
        @generic.argument(Number, Date)
        class MyClass extends GrandSuperClass<number, Date>{ }
        class MyOtherClass extends MyClass {
            @noop()
            str(bool: Date): number { return 20 }
        }
        const meta = reflect(MyOtherClass)
        expect(reflection.getMethods(meta)).toMatchSnapshot()
    })
    it("Should able to inspect generic type on inheritance when generic type parameter stop, with generic data type", () => {
        @generic.parameter("T")
        class Data<T> {
            @type("T")
            data: T
        }
        @generic.parameter("T", "U")
        class GrandSuperClass<T, U>{
            @type(Data, "T")
            str(@type("U") bool: U): T { return {} as any }
        }
        @generic.argument(Number, Date)
        class MyClass extends GrandSuperClass<number, Date>{ }
        class MyOtherClass extends MyClass {
            @noop()
            str(bool: Date): number { return 20 }
        }
        const meta = reflect(MyOtherClass)
        expect(reflection.getMethods(meta)).toMatchSnapshot()
        expect(reflect(meta.methods[0].returnType)).toMatchSnapshot()
    })
    it("Should able to omit generic parameter and argument on derived class, when uses the order is the same", () => {
        @generic.parameter("T")
        class GrandSuperClass<T> {
            @type("T")
            method(): T { return {} as any }
        }
        class SuperClass<T> extends GrandSuperClass<T> {  }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to omit generic parameter even if used on derived class", () => {
        @generic.parameter("T")
        class GrandSuperClass<T> {
            @type("T")
            method(): T { return {} as any }
        }
        class SuperClass<T> extends GrandSuperClass<T> {  
            @type("T")
            property:T
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
})

describe("Array Generic Template", () => {
    it("Should able to inspect array generic type on method", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type(["T"])
            method(): T[] { return {} as any }
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect array generic on method parameter", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            method(@type(["T"]) par: T[]) { return {} as any }
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect array generic on property", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type(["T"])
            prop: T[] = []
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect array generic on getter", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type(["T"])
            get prop(): T[] { return {} as any }
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
})

describe("Array Type", () => {
    it("Should able to inspect array generic type on method", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type("T")
            method(): T { return {} as any }
        }
        @generic.argument([String])
        class MyClass extends SuperClass<string[]>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect array generic on method parameter", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            method(@type("T") par: T) { return {} as any }
        }
        @generic.argument([String])
        class MyClass extends SuperClass<string[]>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect array generic on property", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type("T")
            prop: T = {} as any
        }
        @generic.argument([String])
        class MyClass extends SuperClass<string[]>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect array generic on getter", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type("T")
            get prop(): T { return {} as any }
        }
        @generic.argument([String])
        class MyClass extends SuperClass<string[]>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
})

describe("Generic Type In Member Type", () => {
    @generic.parameter("T")
    class CustomGeneric<T> {
        @type("T")
        prop: T = {} as any
    }
    it("Should able to inspect generic type on method", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type(CustomGeneric, "T")
            method(): CustomGeneric<T> { return {} as any }
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        const meta = reflect(MyClass)
        const par = reflect(meta.methods[0].returnType)
        expect(par).toMatchSnapshot()
    })
    it("Should able to inspect array of generic type on method", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type([CustomGeneric], "T")
            method(): CustomGeneric<T>[] { return {} as any }
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        const meta = reflect(MyClass)
        const par = reflect(meta.methods[0].returnType[0])
        expect(par).toMatchSnapshot()
    })

    it("Should able to inspect generic on method parameter", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            method(@type(CustomGeneric, "T") par: CustomGeneric<T>) { return {} as any }
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        const meta = reflect(MyClass)
        const par = reflect(meta.methods[0].parameters[0].type)
        expect(par).toMatchSnapshot()
    })
    it("Should able to inspect generic on property", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type(CustomGeneric, "T")
            prop: CustomGeneric<T> = {} as any
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        const meta = reflect(MyClass)
        const par = reflect(meta.properties[0].type)
        expect(par).toMatchSnapshot()
    })
    it("Should able to inspect generic on getter", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type(CustomGeneric, "T")
            get prop(): CustomGeneric<T> { return {} as any }
        }
        @generic.argument(String)
        class MyClass extends SuperClass<string>{ }
        const meta = reflect(MyClass)
        const par = reflect(meta.properties[0].type)
        expect(par).toMatchSnapshot()
    })
    it("Should able to define generic type directly using @type()", () => {
        class SuperClass {
            @type(CustomGeneric, Number)
            get prop(): CustomGeneric<Number> { return {} as any }
        }
        const meta = reflect(SuperClass)
        const par = reflect(meta.properties[0].type)
        expect(par).toMatchSnapshot()
    })
    it("Should able to define generic type directly using @type() with type of array", () => {
        class SuperClass {
            @type(CustomGeneric, [Number])
            get prop(): CustomGeneric<Number[]> { return {} as any }
        }
        const meta = reflect(SuperClass)
        const par = reflect(meta.properties[0].type)
        expect(par).toMatchSnapshot()
    })
})

describe("Error Handling", () => {
    it("Should not show error when generic parameter stop", () => {
        @generic.parameter("T")
        class GrandSuperClass<T>{
            @type("T")
            grandSuper: T
        }
        @generic.argument(Number)
        class MyClass extends GrandSuperClass<number>{ }
        class MyRealClass extends MyClass { }
        expect(reflect(MyRealClass)).toMatchSnapshot()
    })
    it("Should not show error in deep inheritance when generic parameter stop", () => {
        @generic.parameter("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            grandSuper(@type("U") par: U): T { return {} as any }
        }
        @generic.parameter("A", "B")
        @generic.argument("A", "B")
        class SuperClass<A, B> extends GrandSuperClass<A, B>{
            @type("B")
            super(@type("A") par: A): B { return {} as any }
        }
        @generic.argument(Number, Date)
        class MyClass extends SuperClass<number, Date>{ }
        class MyRealClass extends MyClass { }
        expect(reflect(MyRealClass)).toMatchSnapshot()
    })
    it("Should show proper error when number of types provided mismatch", () => {
        @generic.parameter("A", "B")
        class SuperClass<A, B> {
            @type("B")
            super(@type("A") par: A): B { return {} as any }
        }
        @generic.argument(Number)
        class MyClass extends SuperClass<number, Date>{ }
        expect(() => reflect(MyClass)).toThrowErrorMatchingSnapshot()
    })
    it("Should show proper error when specify template on type but doesn't specify @generic.template()", () => {
        class SuperClass<A, B> {
            @type("B")
            super(@type("A") par: A): B { return {} as any }
        }
        @generic.argument(Number)
        class MyClass extends SuperClass<number, Date>{ }
        expect(() => reflect(MyClass)).toThrowErrorMatchingSnapshot()
    })
})

describe("Create Generic", () => {
    it("Should able to create generic class implementation", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type("T")
            method(): T { return {} as any }
        }
        const ChildClass = generic.create(SuperClass, Number)
        const instance = new ChildClass()
        expect(instance).toBeInstanceOf(SuperClass)
        expect(instance).toBeInstanceOf(ChildClass)
    })
    it("Should able to change class name", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type("T")
            method(): T { return {} as any }
        }
        const ChildClass = generic.create({ extends: SuperClass, name: "MyDynamicClass" }, Number)
        expect(ChildClass.name).toBe("MyDynamicClass")
    })
    it("Should add reflection properly", () => {
        @generic.parameter("T", "U")
        class SuperClass<T, U> {
            @type("T")
            method(@type("U") par: U): T { return {} as any }
        }
        const ChildClass = generic.create(SuperClass, Number, String)
        expect(reflect(ChildClass)).toMatchSnapshot()
    })
    it("Should able to create multiple time", () => {
        @generic.parameter("T")
        class SuperClass<T> {
            @type("T")
            method(): T { return {} as any }
        }
        const ChildClass = generic.create(SuperClass, Number)
        const instance = new ChildClass()
        expect(instance).toBeInstanceOf(SuperClass)
        expect(instance).toBeInstanceOf(ChildClass)
        const OtherClass = generic.create(SuperClass, String)
        const other = new OtherClass()
        expect(other).toBeInstanceOf(SuperClass)
        expect(other).toBeInstanceOf(OtherClass)
    })
    it("Should execute super class controller", () => {
        const fn = jest.fn()
        @generic.parameter("T")
        class SuperClass<T> {
            constructor() {
                fn()
            }
            @type("T")
            method(): T { return {} as any }
        }
        const ChildClass = generic.create(SuperClass, Number)
        const instance = new ChildClass()
        expect(fn).toBeCalledTimes(1)
    })
})

describe("Get Generic Type", () => {
    it("Should able to get generic type", () => {
        @generic.parameter("A")
        class SuperClass<A> {
            @type("A")
            myProp: A
        }
        @generic.argument(Number)
        class MyClass extends SuperClass<number>{ }
        expect(generic.getType({ type: "A", target: SuperClass }, MyClass)).toBe(Number)
    })
    it("Should able to get generic type with callback style", () => {
        @generic.parameter("A")
        class SuperClass<A> {
            @type(x => "A")
            myProp: A
        }
        @generic.argument(Number)
        class MyClass extends SuperClass<number>{ }
        expect(generic.getType({ type: (x:any) =>  "A", target: SuperClass }, MyClass)).toBe(Number)
    })
    it("Should able to use array generic type", () => {
        @generic.parameter("A")
        class SuperClass<A> {
            @type("A")
            myProp: A
        }
        @generic.argument(Number)
        class MyClass extends SuperClass<number>{ }
        expect(generic.getType({ type: "A", target: SuperClass }, MyClass)).toBe(Number)
    })
    it("Should able to get generic type with multiple templates", () => {
        @generic.parameter("A", "B")
        class SuperClass<A, B> {
            @type("A")
            myProp: A
            @type("B")
            myOther: B
        }
        @generic.argument(Number, String)
        class MyClass extends SuperClass<number, string>{ }
        const c = reflect(MyClass)
        expect(generic.getType({ type: "A", target: SuperClass }, MyClass)).toBe(Number)
        expect(generic.getType({ type: "B", target: SuperClass }, MyClass)).toBe(String)
    })
    it("Should able to work with more complex generic type", () => {
        @generic.parameter("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            grandSuper(@type("U") par: U): T { return {} as any }
        }
        @generic.parameter("A", "B")
        @generic.argument("A", "B")
        class SuperClass<A, B> extends GrandSuperClass<A, B>{
            @type("B")
            super(@type("A") par: A): B { return {} as any }
        }
        @generic.argument(Number, Date)
        class MyClass extends SuperClass<number, Date>{ }
        expect(generic.getType({ type: "T", target: GrandSuperClass }, MyClass)).toBe(Number)
        expect(generic.getType({ type: "U", target: GrandSuperClass }, MyClass)).toBe(Date)
    })
    it("Should able to skip template & type decorator if the pattern is the same", () => {
        @generic.parameter("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            grandSuper(@type("U") par: U): T { return {} as any }
        }
        class SuperClass<A, B> extends GrandSuperClass<A, B>{
            @type("B")
            super(@type("A") par: A): B { return {} as any }
        }
        @generic.argument(Number, Date)
        class MyClass extends SuperClass<number, Date>{ }
        expect(generic.getType({ type: "T", target: GrandSuperClass }, MyClass)).toBe(Number)
        expect(generic.getType({ type: "U", target: GrandSuperClass }, MyClass)).toBe(Date)
    })
    it("Should able to get mixed template with stopped template", () => {
        @generic.parameter("T")
        class Grand<T> {
            @type("T")
            grand: T = {} as any
        }
        @generic.parameter("B")
        @generic.argument(Number)
        class Super<B> extends Grand<Number> {
            @type("B")
            super: B = {} as any
        }
        @generic.argument(String)
        class MyClass extends Super<String> { }
        expect(generic.getType({ type: "B", target: Super }, MyClass)).toBe(String)
    })
    it("Should work when generic type stop", () => {
        @generic.parameter("A")
        class SuperClass<A> {
            @type("A")
            myProp: A
        }
        @generic.argument(Number)
        class MyClass extends SuperClass<number>{ }
        class MyOtherClass extends MyClass { }
        expect(generic.getType({ type: "A", target: SuperClass }, MyOtherClass)).toBe(Number)
    })
    it("Should throw error when the target is not in inheritance", () => {
        @generic.parameter("A")
        class SuperClass<A> {
            @type("A")
            myProp: A
        }
        @generic.argument(Number)
        class MyClass extends SuperClass<number>{ }
        class MyOtherClass { }
        expect(() => generic.getType({ type: "A", target: SuperClass }, MyOtherClass)).toThrowErrorMatchingSnapshot()
    })
    it("Should throw error when provided non string type", () => {
        @generic.parameter("A")
        class SuperClass<A> {
            @type("A")
            myProp: A
        }
        @generic.argument(Number)
        class MyClass extends SuperClass<number>{ }
        expect(() => generic.getType({ type: Object, target: SuperClass }, MyClass)).toThrowErrorMatchingSnapshot()
    })
    it("Should throw error template target doesn't specify @generic.template()", () => {
        class SuperClass<A> {
            @type("A")
            myProp: A
        }
        @generic.argument(Number)
        class MyClass extends SuperClass<number>{ }
        expect(() => generic.getType({ type: "A", target: SuperClass }, MyClass)).toThrowErrorMatchingSnapshot()
    })
})

describe("Get Arguments", () => {
    it("Should able to get generic type parameter", () => {
        @generic.parameter("A")
        class SuperClass<A> {
            @type("A")
            myProp: A
        }
        @generic.argument(Number)
        class MyClass extends SuperClass<number>{ }
        expect(generic.getArguments(MyClass)).toStrictEqual([Number])
    })
    it("Should able to get generic type parameters", () => {
        @generic.parameter("A", "B")
        class SuperClass<A, B> {
            @type("A")
            myProp: A
            @type("B")
            bProp: B
        }
        @generic.argument(Number, String)
        class MyClass extends SuperClass<number, string>{ }
        expect(generic.getArguments(MyClass)).toStrictEqual([Number, String])
    })
    it("Should able to get generic type when generic type stop", () => {
        @generic.parameter("A", "B")
        class SuperClass<A, B> {
            @type("A")
            myProp: A
            @type("B")
            bProp: B
        }
        @generic.argument(Number, String)
        class MyClass extends SuperClass<number, string>{ }
        class MyOtherClass extends MyClass {}
        expect(generic.getArguments(MyOtherClass)).toStrictEqual([Number, String])
    })
    it("Should throw error when non generic type provided", () => {
        class MyClass { }
        expect(() => generic.getArguments(MyClass)).toThrow("MyClass is not a generic type")
    })
})