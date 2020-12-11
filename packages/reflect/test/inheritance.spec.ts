import { decorateClass, decorateMethod, decorateParameter, decorateProperty, DecoratorId, reflect, noop } from "../src"
import * as metadata from "../src/parser"
import { metadata as metadataHelper} from "../src/helpers"

describe("getDeepMember", () => {

    it("Should inspect getter", () => {
        class ChildClass { get data() { return 1 } }
        const members = metadata.getClassMembers(ChildClass)
        expect(members).toMatchObject(["data"])
    })

    it("Should inspect function", () => {
        class ChildClass { myFunction() { } }
        const members = metadata.getClassMembers(ChildClass)
        expect(members).toMatchObject(["myFunction"])
    })

    it("Should inspect property", () => {
        class ChildClass {
            @decorateProperty({})
            myProp = 1
        }
        const members = metadata.getClassMembers(ChildClass)
        expect(members).toMatchObject(["myProp"])
    })

})

describe("Inheritance", () => {
    it("Should get base class properties", () => {
        class BaseClass {
            @decorateProperty({ value: 1 })
            parentProp = 1
        }
        class ChildClass extends BaseClass { }
        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should get base class from deep inheritance", () => {

        class BaseClass {
            @decorateProperty({ value: 1 })
            parentProp = 1
        }
        class ChildClass extends BaseClass {
            @decorateProperty({ value: 1 })
            childProp = 1
        }
        class GrandChildClass extends ChildClass {
            @decorateProperty({ value: 1 })
            grandChildProp = 1
        }
        class GreatGrandChildClass extends GrandChildClass {
            @decorateProperty({ value: 1 })
            greatGrandChildProp = 1
        }
        const meta = reflect(GreatGrandChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should get base class getter", () => {
        class BaseClass {
            get parentProp() { return 1 }
        }
        class ChildClass extends BaseClass {
            get childProp() { return 1 }
        }
        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should get base class method", () => {
        class BaseClass {
            myMethod() { }
        }
        class ChildClass extends BaseClass { }
        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should get proper overridden method parameters", () => {
        class BaseClass {
            myMethod(par1:number, par2:number, par3:number) { }
        }
        class ChildClass extends BaseClass { 
            myMethod(par1:number) { }
        }
        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should not inherit parameter", () => {
        class BaseClass {
            myMethod(par1:number, par2:number, par3:number) { }
        }
        class ChildClass extends BaseClass { 
            myMethod(one:number, two:number) { }
        }
        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect domain with inheritance using constructor property", () => {
        @reflect.parameterProperties()
        class DomainBase {
            constructor(
                public id = 0,
                public createdAt = new Date()
            ) { }
        }
        @reflect.parameterProperties()
        class Item extends DomainBase {
            constructor(
                public name: string,
                public discontinue: boolean,
                public price: number,
                public type: "Tools" | "Goods"
            ) { super() }
        }
        const meta = reflect(Item)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect domain with inheritance using property", () => {
        @reflect.parameterProperties()
        class DomainBase {
            @decorateProperty({})
            id = 0
            @decorateProperty({})
            createdAt = new Date()
        }
        @reflect.parameterProperties()
        class Item extends DomainBase {
            constructor(
                public name: string,
                public discontinue: boolean,
                public price: number,
                public type: "Tools" | "Goods"
            ) { super() }
        }
        const meta = reflect(Item)
        expect(meta).toMatchSnapshot()
    })

    it("Overridden method should not duplicated", () => {
        class BaseClass {
            myMethod(a: string): string { return "" }
        }
        class ChildClass extends BaseClass {
            myMethod(a: string): string { return "Hello" }
        }
        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should not override private method", () => {
        class BaseClass {
            @reflect.ignore()
            privateMethod(a: string): string { return "" }
        }
        class ChildClass extends BaseClass {
            myMethod(a: string): string { return "Hello" }
        }
        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should not override private property", () => {
        class BaseClass {
            @reflect.ignore()
            baseProp: number = 1
        }
        class ChildClass extends BaseClass {
            @reflect.noop()
            childProp: number = 2
        }
        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Overridden parameter property should not duplicated", () => {
        @reflect.parameterProperties()
        class BaseClass {
            constructor(public propOne: string, public propTwo: string) { }
        }
        @reflect.parameterProperties()
        class ChildClass extends BaseClass {
            constructor(public propOne: string, public propTwo: string) {
                super(propOne, propTwo)
            }
        }
        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should populate property decorator properly on inheritance", () => {
        @reflect.parameterProperties()
        class BaseClass {
            constructor(
                @decorateProperty({ cache: 10 })
                public propOne: string = "",
                @decorateProperty({ cache: 20 })
                public propTwo: string = ""
            ) { }
        }
        @reflect.parameterProperties()
        class ChildClass extends BaseClass {
            constructor(public name: string, public date: Date) {
                super()
            }
        }

        const meta = reflect(ChildClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to get proper overridden parameter type", () => {
        class BaseEntity { }
        class Entity extends BaseEntity { }
        class BaseMyClass {
            @noop()
            method(entity: BaseEntity) { }
        }
        class MyClass {
            @noop()
            method(entity: Entity) { }
        }
        const meta = reflect(MyClass)
        expect(meta).toMatchSnapshot()
    })

    describe("Decorators", () => {
        describe("Decorator On Class", () => {
            it("Should get base class decorators", () => {
                @decorateClass({ value: 1 })
                @decorateClass({ value: 2 })
                class BaseClass {
                }
                class ChildClass extends BaseClass { }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should merge base class decorators and child decorators", () => {
                @decorateClass({ value: 1 })
                @decorateClass({ value: 2 })
                class BaseClass {
                }
                @decorateClass({ value: 3 })
                @decorateClass({ value: 4 })
                class ChildClass extends BaseClass { }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should not inherit decorator if specified", () => {
                @decorateClass({ value: 1 }, { inherit: false })
                @decorateClass({ value: 2 })
                class BaseClass {
                }
                @decorateClass({ value: 3 })
                class ChildClass extends BaseClass { }
                const parMeta = reflect(BaseClass)
                const meta = reflect(ChildClass)
                expect(parMeta).toMatchSnapshot()
                expect(meta).toMatchSnapshot()
            })

            it("Should not merge decorator if not allowMultiple", () => {
                @decorateClass({ [DecoratorId]: "the-id", value: 1 }, { allowMultiple: false })
                @decorateClass({ value: 2 })
                class BaseClass {
                }
                @decorateClass({ [DecoratorId]: "the-id", value: 3 })
                class ChildClass extends BaseClass { }
                const parMeta = reflect(BaseClass)
                const meta = reflect(ChildClass)
                expect(parMeta).toMatchSnapshot()
                expect(meta).toMatchSnapshot()
            })
        })

        describe("Decorator on property", () => {
            it("Should get decorator on property", () => {
                class BaseClass {
                    @decorateProperty({ value: 1 })
                    parentProp: number = 2
                }
                class ChildClass extends BaseClass {
                    @decorateProperty({ value: 2 })
                    childProp: number = 2
                }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should get decorator on parameter property", () => {
                @reflect.parameterProperties()
                class BaseClass {
                    constructor(
                        @decorateProperty({ value: 1 })
                        public parentProp: number = 2
                    ) { }
                }
                class ChildClass extends BaseClass {

                }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should get base class getter decorator", () => {
                class BaseClass {
                    @decorateProperty({ value: 1 })
                    get parentProp() { return 1 }
                }
                class ChildClass extends BaseClass {
                    //override
                    get parentProp() { return 3 }
                }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should not inherit if specified", () => {
                class BaseClass {
                    @decorateProperty({ value: 1 }, { inherit: false })
                    get parentProp() { return 1 }
                }
                class ChildClass extends BaseClass {
                    //override
                    get parentProp() { return 3 }
                }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should inherit on non overridden property", () => {
                class BaseClass {
                    @decorateProperty({ value: 1 }, { inherit: false })
                    get parentProp() { return 1 }
                }
                class ChildClass extends BaseClass {
                }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should not merge decorator if not allowMultiple", () => {
                class BaseClass {
                    @decorateProperty({ [DecoratorId]: "id", value: 1 }, { allowMultiple: false })
                    get parentProp() { return 1 }
                }
                class ChildClass extends BaseClass {
                    //override
                    @decorateProperty({ [DecoratorId]: "id", value: 1 }, { allowMultiple: false })
                    get parentProp() { return 3 }
                }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })
        })

        describe("Decorator on Method", () => {
            it("Should get base class method decorator", () => {
                class BaseClass {
                    @decorateMethod({ value: 1 })
                    myMethod(a: string): string { return "" }
                }
                class ChildClass extends BaseClass { }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should merge decorators by default", () => {
                class BaseClass {
                    @decorateMethod({ value: 1 })
                    myMethod(a: string): string { return "" }
                }
                class ChildClass extends BaseClass {
                    @decorateMethod({ value: 2 })
                    myMethod(a: string): string { return "" }
                }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should not inherit decorator if specified", () => {
                class BaseClass {
                    @decorateMethod({ value: 1 }, { inherit: false })
                    myMethod(a: string): string { return "" }
                }
                class ChildClass extends BaseClass {
                    @decorateMethod({ value: 2 })
                    myMethod(a: string): string { return "" }
                }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should inherit decorator on non overridden method", () => {
                class BaseClass {
                    @decorateMethod({ value: 1 }, { inherit: false })
                    myMethod(a: string): string { return "" }
                }
                class ChildClass extends BaseClass { }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should not merge decorators if not allowMultiple", () => {
                class BaseClass {
                    @decorateMethod({ [DecoratorId]: "id", value: 1 }, { allowMultiple: false })
                    myMethod(a: string): string { return "" }
                }
                class ChildClass extends BaseClass {
                    @decorateMethod({ [DecoratorId]: "id", value: 1 }, { allowMultiple: false })
                    myMethod(a: string): string { return "" }
                }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })
        })

        describe("Decorator on Method Parameter", () => {
            it("Should get base class parameter decorator", () => {
                class BaseClass {
                    myMethod(@decorateParameter({ value: 1 }) a: string): string { return "" }
                }
                class ChildClass extends BaseClass { }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should merge decorators by default", () => {
                class BaseClass {
                    myMethod(@decorateParameter({ value: 1 }) a: string): string { return "" }
                }
                class ChildClass extends BaseClass {
                    myMethod(@decorateParameter({ value: 2 }) a: string): string { return "" }
                }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should not include decorators if parameter not included on derived method", () => {
                class BaseClass {
                    myMethod(@decorateParameter({ value: 1 }) a: string, @decorateParameter({ value: 3 }) c: number): string { return "" }
                }
                class ChildClass extends BaseClass {
                    myMethod(@decorateParameter({ value: 2 }) a: string): string { return "" }
                }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should not inherit decorator if specified", () => {
                class BaseClass {
                    myMethod(@decorateParameter({ value: 1 }, { inherit: false }) a: string): string { return "" }
                }
                class ChildClass extends BaseClass {
                    myMethod(@decorateParameter({ value: 2 }) a: string): string { return "" }
                }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })

            it("Should not merge decorators if not allowMultiple", () => {
                class BaseClass {
                    myMethod(@decorateParameter({ [DecoratorId]: "id", value: 1 }, { allowMultiple: false }) a: string): string { return "" }
                }
                class ChildClass extends BaseClass {
                    myMethod(@decorateParameter({ [DecoratorId]: "id", value: 2 }) a: string): string { return "" }
                }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })
        })

        describe("Decorator on Constructor Parameter", () => {
            it("Should not get base class parameter", () => {
                class BaseClass {
                    constructor(a: string) { }
                }
                class ChildClass extends BaseClass { }
                const meta = reflect(ChildClass)
                expect(meta).toMatchSnapshot()
            })
        })
    })
})
