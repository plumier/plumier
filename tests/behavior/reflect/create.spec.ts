import reflect, { generic, type, reflection } from "@plumier/reflect"


describe("Create Class", () => {
    it("Should able to create class by definition", () => {
        const obj = reflect.create({ string: String, bool: Boolean, date: Date, number: Number } )
        const meta = reflect(obj)
        expect(reflection.getProperties(meta)).toMatchSnapshot()
    })
    it("Should able to define name", () => {
        const obj = reflect.create({ string: String, bool: Boolean, date: Date, number: Number }, {name: "MyClass" })
        expect(obj.name).toBe("MyClass")
    })
    it("Should able to use array property", () => {
        const obj = reflect.create({ string: [String], bool: [Boolean], date: [Date], number: [Number] } )
        const meta = reflect(obj)
        expect(reflection.getProperties(meta)).toMatchSnapshot()
    })
    it("Should able to use array property", () => {
        const obj = reflect.create({ string: [String], bool: [Boolean], date: [Date], number: [Number] } )
        const meta = reflect(obj)
        expect(reflection.getProperties(meta)).toMatchSnapshot()
    })
    it("Should able to extends from other class", () => {
        class User { }
        const obj = reflect.create({ string: [String], bool: [Boolean], date: [Date], number: [Number] }, {extends: User })
        const meta = reflect(obj)
        expect(meta).toMatchSnapshot()
    })
    it("Should able to create class with nested object", () => {
        const type = reflect.create({ user: { name: String, dob: Date } })
        const meta = reflect(type)
        expect(meta).toMatchSnapshot()
        expect(reflect(meta.properties[0].type)).toMatchSnapshot()
    })
    it("Should able to create class with nested array object", () => {
        const type = reflect.create({ users: [{ name: String, dob: Date }] })
        const meta = reflect(type)
        expect(meta).toMatchSnapshot()
        expect(reflect(meta.properties[0].type[0])).toMatchSnapshot()
    })
    describe("Generic", () => {
        it("Should able to create generic class implementation", () => {
            @generic.parameter("T")
            class SuperClass<T> {
                @type("T")
                method(): T { return {} as any }
            }
            const ChildClass = reflect.create({}, { extends: SuperClass })
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
            const ChildClass = reflect.create({}, { extends: SuperClass, name: "MyDynamicClass", genericParams: [Number] })
            expect(ChildClass.name).toBe("MyDynamicClass")
        })
        it("Should add reflection properly", () => {
            @generic.parameter("T", "U")
            class SuperClass<T, U> {
                @type("T")
                method(@type("U") par: U): T { return {} as any }
            }
            const ChildClass = reflect.create({}, { extends: SuperClass, genericParams: [Number, String] })
            expect(reflect(ChildClass)).toMatchSnapshot()
        })
        it("Should able to create multiple time", () => {
            @generic.parameter("T")
            class SuperClass<T> {
                @type("T")
                method(): T { return {} as any }
            }
            const ChildClass = reflect.create({}, { extends: SuperClass, genericParams: [Number] })
            const instance = new ChildClass()
            expect(instance).toBeInstanceOf(SuperClass)
            expect(instance).toBeInstanceOf(ChildClass)
            const OtherClass = reflect.create({}, { extends: SuperClass, genericParams: [String] })
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
            const ChildClass = reflect.create({}, { extends: SuperClass, genericParams: [Number] })
            const instance = new ChildClass()
            expect(fn).toBeCalledTimes(1)
        })
    })
})
