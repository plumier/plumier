import reflect, { generic, type, parameterProperties, reflection, DecoratorOptionId, DecoratorId, noop } from "@plumier/reflect"



describe("Generic", () => {
    it("Should able to inspect generic type on method", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type("T")
            method(): T { return {} as any }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect generic on method parameter", () => {
        @generic.template("T")
        class SuperClass<T> {
            method(@type("T") par: T) { return {} as any }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect generic on property", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type("T")
            prop: T = {} as any
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect generic on getter", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type("T")
            get prop(): T { return {} as any }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect generic on parameter properties", () => {
        @generic.template("T")
        @parameterProperties()
        class SuperClass<T> {
            constructor(@type("T") public prop: T) { }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should not error inspect the generic class", () => {
        @generic.template("T")
        class SuperClass<T> {
            constructor(@type("T") par: T) { }
        }
        expect(reflect(SuperClass)).toMatchSnapshot()
    })
    it("Should able to inspect properties on deep inheritance", () => {
        @generic.template("T")
        class Grand<T> {
            @type("T")
            grand: T = {} as any
        }
        @generic.template("B")
        @generic.type(Number)
        class Super<B> extends Grand<Number> {
            @type("B")
            super: B = {} as any
        }
        @generic.type(String)
        class MyClass extends Super<String> { }
        const meta = reflect(MyClass)
        expect(reflection.getProperties(meta)).toMatchSnapshot()
        expect(meta).toMatchSnapshot()
    })
    it("Should able to inspect inherited generic type", () => {
        @generic.template("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            str(@type("U") bool: U): T { return {} as any }
        }
        @generic.template("T", "U")
        @generic.type(String, Boolean)
        class SuperClass<T, U> extends GrandSuperClass<string, Boolean>{
            @type("T")
            num(@type("U") date: U): T { return {} as any }
        }
        @generic.type(Number, Date)
        class MyClass extends SuperClass<number, Date>{ }
        const meta = reflect(MyClass)
        expect(reflection.getMethods(meta)).toMatchSnapshot()
        expect(meta).toMatchSnapshot()
    })
    it("Should able to inspect nested generic class with multiple template", () => {
        @generic.template("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            grandSuper(@type("U") par: U): T { return {} as any }
        }
        @generic.template("A", "B")
        @generic.type("A", "B")
        class SuperClass<A, B> extends GrandSuperClass<A, B>{
            @type("B")
            super(@type("A") par: A): B { return {} as any }
        }
        @generic.type(Number, Date)
        class MyClass extends SuperClass<number, Date>{ }
        const meta = reflect(MyClass)
        expect(reflection.getMethods(meta)).toMatchSnapshot()
        expect(meta).toMatchSnapshot()
    })
    it("Should inherit generic data type when overridden", () => {
        @generic.template("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            grandSuper(@type("U") par: U): T { return {} as any }
        }
        @generic.template("T", "U")
        @generic.type("T", "U")
        class SuperClass<A, B> extends GrandSuperClass<A, B>{
            grandSuper(pur: B): A { return {} as any }
        }
        @generic.type(Number, Date)
        class MyClass extends SuperClass<number, Date>{ }
        const meta = reflect(MyClass)
        expect(reflection.getMethods(meta)).toMatchSnapshot()
        expect(meta).toMatchSnapshot()
    })
    it("Should able to inspect generic type on inheritance when generic type parameter stop", () => {
        @generic.template("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            str(@type("U") bool: U): T { return {} as any }
        }
        @generic.type(Number, Date)
        class MyClass extends GrandSuperClass<number, Date>{ }
        class MyOtherClass extends MyClass {
            @noop()
            str(bool: Date): number { return 20 }
        }
        const meta = reflect(MyOtherClass)
        expect(reflection.getMethods(meta)).toMatchSnapshot()
    })
    it("Should able to inspect generic type on inheritance when generic type parameter stop, with generic data type", () => {
        @generic.template("T")
        class Data<T> {
            @type("T")
            data: T
        }
        @generic.template("T", "U")
        class GrandSuperClass<T, U>{
            @type(Data, "T")
            str(@type("U") bool: U): T { return {} as any }
        }
        @generic.type(Number, Date)
        class MyClass extends GrandSuperClass<number, Date>{ }
        class MyOtherClass extends MyClass {
            @noop()
            str(bool: Date): number { return 20 }
        }
        const meta = reflect(MyOtherClass)
        expect(reflection.getMethods(meta)).toMatchSnapshot()
        expect(reflect(meta.methods[0].returnType)).toMatchSnapshot()
    })
})

describe("Array Generic Template", () => {
    it("Should able to inspect array generic type on method", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type(["T"])
            method(): T[] { return {} as any }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect array generic on method parameter", () => {
        @generic.template("T")
        class SuperClass<T> {
            method(@type(["T"]) par: T[]) { return {} as any }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect array generic on property", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type(["T"])
            prop: T[] = []
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect array generic on getter", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type(["T"])
            get prop(): T[] { return {} as any }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
})

describe("Array Type", () => {
    it("Should able to inspect array generic type on method", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type("T")
            method(): T { return {} as any }
        }
        @generic.type([String])
        class MyClass extends SuperClass<string[]>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect array generic on method parameter", () => {
        @generic.template("T")
        class SuperClass<T> {
            method(@type("T") par: T) { return {} as any }
        }
        @generic.type([String])
        class MyClass extends SuperClass<string[]>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect array generic on property", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type("T")
            prop: T = {} as any
        }
        @generic.type([String])
        class MyClass extends SuperClass<string[]>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
    it("Should able to inspect array generic on getter", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type("T")
            get prop(): T { return {} as any }
        }
        @generic.type([String])
        class MyClass extends SuperClass<string[]>{ }
        expect(reflect(MyClass)).toMatchSnapshot()
    })
})

describe("Type With Generic Type Parameter", () => {
    @generic.template("T")
    class CustomGeneric<T> {
        @type("T")
        prop: T = {} as any
    }
    it("Should able to inspect generic type on method", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type(CustomGeneric, "T")
            method(): CustomGeneric<T> { return {} as any }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        const meta = reflect(MyClass)
        const par = reflect(meta.methods[0].returnType)
        expect(par).toMatchSnapshot()
    })
    it("Should able to inspect array of generic type on method", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type([CustomGeneric], "T")
            method(): CustomGeneric<T>[] { return {} as any }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        const meta = reflect(MyClass)
        const par = reflect(meta.methods[0].returnType[0])
        expect(par).toMatchSnapshot()
    })

    it("Should able to inspect generic on method parameter", () => {
        @generic.template("T")
        class SuperClass<T> {
            method(@type(CustomGeneric, "T") par: CustomGeneric<T>) { return {} as any }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        const meta = reflect(MyClass)
        const par = reflect(meta.methods[0].parameters[0].type)
        expect(par).toMatchSnapshot()
    })
    it("Should able to inspect generic on property", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type(CustomGeneric, "T")
            prop: CustomGeneric<T> = {} as any
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        const meta = reflect(MyClass)
        const par = reflect(meta.properties[0].type)
        expect(par).toMatchSnapshot()
    })
    it("Should able to inspect generic on getter", () => {
        @generic.template("T")
        class SuperClass<T> {
            @type(CustomGeneric, "T")
            get prop(): CustomGeneric<T> { return {} as any }
        }
        @generic.type(String)
        class MyClass extends SuperClass<string>{ }
        const meta = reflect(MyClass)
        const par = reflect(meta.properties[0].type)
        expect(par).toMatchSnapshot()
    })
})

describe("Error Handling", () => {
    it("Should not show error when generic parameter stop", () => {
        @generic.template("T")
        class GrandSuperClass<T>{
            @type("T")
            grandSuper: T
        }
        @generic.type(Number)
        class MyClass extends GrandSuperClass<number>{ }
        class MyRealClass extends MyClass { }
        expect(reflect(MyRealClass)).toMatchSnapshot()
    })
    it("Should not show error in deep inheritance when generic parameter stop", () => {
        @generic.template("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            grandSuper(@type("U") par: U): T { return {} as any }
        }
        @generic.template("A", "B")
        @generic.type("A", "B")
        class SuperClass<A, B> extends GrandSuperClass<A, B>{
            @type("B")
            super(@type("A") par: A): B { return {} as any }
        }
        @generic.type(Number, Date)
        class MyClass extends SuperClass<number, Date>{ }
        class MyRealClass extends MyClass { }
        expect(reflect(MyRealClass)).toMatchSnapshot()
    })
    it("Should show proper error when number of types provided mismatch", () => {
        @generic.template("A", "B")
        class SuperClass<A, B> {
            @type("B")
            super(@type("A") par: A): B { return {} as any }
        }
        @generic.type(Number)
        class MyClass extends SuperClass<number, Date>{ }
        expect(() => reflect(MyClass)).toThrowErrorMatchingSnapshot()
    })
    it("Should show proper error when specify template on type but doesn't specify @generic.template()", () => {
        class SuperClass<A, B> {
            @type("B")
            super(@type("A") par: A): B { return {} as any }
        }
        @generic.type(Number)
        class MyClass extends SuperClass<number, Date>{ }
        expect(() => reflect(MyClass)).toThrowErrorMatchingSnapshot()
    })
})

describe("Create Generic", () => {
    it("Should able to create generic class implementation", () => {
        @generic.template("T")
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
        @generic.template("T")
        class SuperClass<T> {
            @type("T")
            method(): T { return {} as any }
        }
        const ChildClass = generic.create({ extends: SuperClass, name: "MyDynamicClass" }, Number)
        expect(ChildClass.name).toBe("MyDynamicClass")
    })
    it("Should add reflection properly", () => {
        @generic.template("T", "U")
        class SuperClass<T, U> {
            @type("T")
            method(@type("U") par: U): T { return {} as any }
        }
        const ChildClass = generic.create(SuperClass, Number, String)
        expect(reflect(ChildClass)).toMatchSnapshot()
    })
    it("Should able to create multiple time", () => {
        @generic.template("T")
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
        @generic.template("T")
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
        @generic.template("A")
        class SuperClass<A> {
            @type("A")
            myProp: A
        }
        @generic.type(Number)
        class MyClass extends SuperClass<number>{ }
        expect(generic.getType({ type: "A", target: SuperClass }, MyClass)).toBe(Number)
    })
    it("Should able to get generic type with callback style", () => {
        @generic.template("A")
        class SuperClass<A> {
            @type(x => "A")
            myProp: A
        }
        @generic.type(Number)
        class MyClass extends SuperClass<number>{ }
        expect(generic.getType({ type: (x:any) =>  "A", target: SuperClass }, MyClass)).toBe(Number)
    })
    it("Should able to use array generic type", () => {
        @generic.template("A")
        class SuperClass<A> {
            @type("A")
            myProp: A
        }
        @generic.type(Number)
        class MyClass extends SuperClass<number>{ }
        expect(generic.getType({ type: "A", target: SuperClass }, MyClass)).toBe(Number)
    })
    it("Should able to get generic type with multiple templates", () => {
        @generic.template("A", "B")
        class SuperClass<A, B> {
            @type("A")
            myProp: A
            @type("B")
            myOther: B
        }
        @generic.type(Number, String)
        class MyClass extends SuperClass<number, string>{ }
        const c = reflect(MyClass)
        expect(generic.getType({ type: "A", target: SuperClass }, MyClass)).toBe(Number)
        expect(generic.getType({ type: "B", target: SuperClass }, MyClass)).toBe(String)
    })
    it("Should able to work with more complex generic type", () => {
        @generic.template("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            grandSuper(@type("U") par: U): T { return {} as any }
        }
        @generic.template("A", "B")
        @generic.type("A", "B")
        class SuperClass<A, B> extends GrandSuperClass<A, B>{
            @type("B")
            super(@type("A") par: A): B { return {} as any }
        }
        @generic.type(Number, Date)
        class MyClass extends SuperClass<number, Date>{ }
        expect(generic.getType({ type: "T", target: GrandSuperClass }, MyClass)).toBe(Number)
        expect(generic.getType({ type: "U", target: GrandSuperClass }, MyClass)).toBe(Date)
    })
    it("Should able to skip template & type decorator if the pattern is the same", () => {
        @generic.template("T", "U")
        class GrandSuperClass<T, U>{
            @type("T")
            grandSuper(@type("U") par: U): T { return {} as any }
        }
        class SuperClass<A, B> extends GrandSuperClass<A, B>{
            @type("B")
            super(@type("A") par: A): B { return {} as any }
        }
        @generic.type(Number, Date)
        class MyClass extends SuperClass<number, Date>{ }
        expect(generic.getType({ type: "T", target: GrandSuperClass }, MyClass)).toBe(Number)
        expect(generic.getType({ type: "U", target: GrandSuperClass }, MyClass)).toBe(Date)
    })
    it("Should able to get mixed template with stopped template", () => {
        @generic.template("T")
        class Grand<T> {
            @type("T")
            grand: T = {} as any
        }
        @generic.template("B")
        @generic.type(Number)
        class Super<B> extends Grand<Number> {
            @type("B")
            super: B = {} as any
        }
        @generic.type(String)
        class MyClass extends Super<String> { }
        expect(generic.getType({ type: "B", target: Super }, MyClass)).toBe(String)
    })
    it("Should work when generic type stop", () => {
        @generic.template("A")
        class SuperClass<A> {
            @type("A")
            myProp: A
        }
        @generic.type(Number)
        class MyClass extends SuperClass<number>{ }
        class MyOtherClass extends MyClass { }
        expect(generic.getType({ type: "A", target: SuperClass }, MyOtherClass)).toBe(Number)
    })
    it("Should throw error when the target is not in inheritance", () => {
        @generic.template("A")
        class SuperClass<A> {
            @type("A")
            myProp: A
        }
        @generic.type(Number)
        class MyClass extends SuperClass<number>{ }
        class MyOtherClass { }
        expect(() => generic.getType({ type: "A", target: SuperClass }, MyOtherClass)).toThrowErrorMatchingSnapshot()
    })
    it("Should throw error when provided non string type", () => {
        @generic.template("A")
        class SuperClass<A> {
            @type("A")
            myProp: A
        }
        @generic.type(Number)
        class MyClass extends SuperClass<number>{ }
        expect(() => generic.getType({ type: Object, target: SuperClass }, MyClass)).toThrowErrorMatchingSnapshot()
    })
    it("Should throw error template target doesn't specify @generic.template()", () => {
        class SuperClass<A> {
            @type("A")
            myProp: A
        }
        @generic.type(Number)
        class MyClass extends SuperClass<number>{ }
        expect(() => generic.getType({ type: "A", target: SuperClass }, MyClass)).toThrowErrorMatchingSnapshot()
    })
})

describe("Get Generic Type Parameters", () => {
    it("Should able to get generic type parameter", () => {
        @generic.template("A")
        class SuperClass<A> {
            @type("A")
            myProp: A
        }
        @generic.type(Number)
        class MyClass extends SuperClass<number>{ }
        expect(generic.getGenericTypeParameters(MyClass)).toStrictEqual([Number])
    })
    it("Should able to get generic type parameters", () => {
        @generic.template("A", "B")
        class SuperClass<A, B> {
            @type("A")
            myProp: A
            @type("B")
            bProp: B
        }
        @generic.type(Number, String)
        class MyClass extends SuperClass<number, string>{ }
        expect(generic.getGenericTypeParameters(MyClass)).toStrictEqual([Number, String])
    })
    it("Should able to get generic type when generic type stop", () => {
        @generic.template("A", "B")
        class SuperClass<A, B> {
            @type("A")
            myProp: A
            @type("B")
            bProp: B
        }
        @generic.type(Number, String)
        class MyClass extends SuperClass<number, string>{ }
        class MyOtherClass extends MyClass {}
        expect(generic.getGenericTypeParameters(MyOtherClass)).toStrictEqual([Number, String])
    })
    it("Should throw error when non generic type provided", () => {
        class MyClass { }
        expect(() => generic.getGenericTypeParameters(MyClass)).toThrow("MyClass is not a generic type")
    })
})