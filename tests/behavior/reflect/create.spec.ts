import reflect, { generic, type, reflection } from "@plumier/reflect"


describe("Create Class", () => {
    it("Should able to create class by definition", () => {
        const obj = reflect.create({ definition: { string: String, bool: Boolean, date: Date, number: Number } })
        const meta = reflect(obj)
        expect(reflection.getProperties(meta)).toMatchSnapshot()
    })
    it("Should able to define name", () => {
        const obj = reflect.create({ definition: { string: String, bool: Boolean, date: Date, number: Number }, name: "MyClass" })
        expect(obj.name).toBe("MyClass")
    })
    it("Should able to use array property", () => {
        const obj = reflect.create({ definition: { string: [String], bool: [Boolean], date: [Date], number: [Number] } })
        const meta = reflect(obj)
        expect(reflection.getProperties(meta)).toMatchSnapshot()
    })
    it("Should able to use array property", () => {
        const obj = reflect.create({ definition: { string: [String], bool: [Boolean], date: [Date], number: [Number] } })
        const meta = reflect(obj)
        expect(reflection.getProperties(meta)).toMatchSnapshot()
    })
    it("Should able to extends from other class", () => {
        class User { }
        const obj = reflect.create({ definition: { string: [String], bool: [Boolean], date: [Date], number: [Number] }, parent: User })
        const meta = reflect(obj)
        expect(meta).toMatchSnapshot()
    })
    describe("Generic", () => {
        it("Should able to create generic class implementation", () => {
            @generic.template("T")
            class SuperClass<T> {
                @type("T")
                method(): T { return {} as any }
            }
            const ChildClass = reflect.create({ parent: SuperClass })
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
            const ChildClass = reflect.create({ parent: SuperClass, name: "MyDynamicClass", genericParams: [Number] })
            expect(ChildClass.name).toBe("MyDynamicClass")
        })
        it("Should add reflection properly", () => {
            @generic.template("T", "U")
            class SuperClass<T, U> {
                @type("T")
                method(@type("U") par: U): T { return {} as any }
            }
            const ChildClass = reflect.create({ parent: SuperClass, genericParams: [Number, String] })
            expect(reflect(ChildClass)).toMatchSnapshot()
        })
        it("Should able to create multiple time", () => {
            @generic.template("T")
            class SuperClass<T> {
                @type("T")
                method(): T { return {} as any }
            }
            const ChildClass = reflect.create({ parent: SuperClass, genericParams: [Number] })
            const instance = new ChildClass()
            expect(instance).toBeInstanceOf(SuperClass)
            expect(instance).toBeInstanceOf(ChildClass)
            const OtherClass = reflect.create({ parent: SuperClass, genericParams: [String] })
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
            const ChildClass = reflect.create({ parent: SuperClass, genericParams: [Number] })
            const instance = new ChildClass()
            expect(fn).toBeCalledTimes(1)
        })
    })
})
