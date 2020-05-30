import reflect, { generic, GenericTypeDecorator, decorateClass, decorate, decorateProperty, PropertyReflection, metadata } from 'tinspector'
import { domain } from './decorator'
import { route } from './decorator.route'
import { val } from 'typedconverter'
import { bind } from './decorator.bind'
import { Class } from './common'
import { generateRoutes } from './route-generator'


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface OneToManyDecorator {
    kind: "GenericDecoratorOneToMany"
    propertyName: string,
    type: Class | Class[] | ((x: any) => Class | Class[]),
    parentType: Class
}

interface IdentifierDecorator {
    kind: "GenericDecoratorId",
}


// --------------------------------------------------------------------- //
// ----------------------------- DECORATOR ----------------------------- //
// --------------------------------------------------------------------- //

namespace entity {
    export function oneToMany(type: Class | Class[] | ((x: any) => Class | Class[])) {
        return decorateProperty((target: any, propertyName) => <OneToManyDecorator>{ kind: "GenericDecoratorOneToMany", propertyName, type, parentType: target })
    }

    export function id() {
        return decorateProperty(<IdentifierDecorator>{ kind: "GenericDecoratorId" })
    }
}


// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

function getIdType(type: Class): Class {
    const meta = reflect(type)
    for (const prop of meta.properties) {
        const decorator = prop.decorators.find((x: IdentifierDecorator) => x.kind === "GenericDecoratorId")
        if (decorator) return prop.type
    }
    return String
}

function getGenericTypeParameters(instance: object) {
    const meta = reflect(instance.constructor as Class)
    const genericDecorator = meta.decorators
        .find((x: GenericTypeDecorator): x is GenericTypeDecorator => x.kind == "GenericType" && x.target === instance.constructor)
    return {
        types: genericDecorator!.types.map(x => x as Class),
        meta
    }
}

function createController(entity: Class, controller: typeof GenericController, nameConversion: (x: string) => string) {
    // get type of ID column on entity
    const idType = getIdType(entity)
    // create controller type dynamically 
    const Controller = generic.create(controller, entity, idType)
    // add root decorator
    const name = nameConversion(entity.name)
    Reflect.decorate([route.root(name)], Controller)
    return Controller
}

function createNestedController(dec: OneToManyDecorator, controller: typeof GenericOneToManyController, nameConversion: (x: string) => string) {
    const decType = metadata.isCallback(dec.type) ? dec.type({}) : dec.type
    const realType = Array.isArray(decType) ? decType[0] : decType
    // get type of ID column on parent entity
    const parentIdType = getIdType(dec.parentType)
    // get type of ID column on entity
    const idType = getIdType(realType)
    // create controller 
    const Controller = generic.create(controller, dec.parentType, realType, parentIdType, idType)
    // add root decorator
    const name = nameConversion(dec.parentType.name)
    Reflect.decorate([
        route.root(`${name}/:pid/${dec.propertyName}`),
        // re-assign oneToMany decorator which will be used on OneToManyController constructor
        decorateClass(dec)],
        Controller)
    return Controller
}

function createRoutesFromEntities(entities: Class[], controller: typeof GenericController, oneToManyController: typeof GenericOneToManyController, nameConversion: (x: string) => string) {
    const controllers = []
    for (const entity of entities) {
        controllers.push(createController(entity, controller, nameConversion))
        const meta = reflect(entity)
        for (const prop of meta.properties) {
            const oneToMany = prop.decorators.find((x: OneToManyDecorator): x is OneToManyDecorator => x.kind === "GenericDecoratorOneToMany")
            if (oneToMany) {
                controllers.push(createNestedController(oneToMany, oneToManyController, nameConversion))
            }
        }
    }
    return generateRoutes(controllers, { overridable: true })
}

// --------------------------------------------------------------------- //
// ---------------------------- CONTROLLERS ---------------------------- //
// --------------------------------------------------------------------- //

@domain()
@generic.template("TID")
class IdentifierResult<TID> {
    constructor(
        @reflect.type("TID")
        public id: TID
    ) { }
}

@generic.template("T", "TID")
class GenericController<T, TID>{
    protected readonly entityType: Class<T>
    constructor() {
        const { types } = getGenericTypeParameters(this)
        this.entityType = types[0]
    }

    @route.get("")
    @reflect.type(["T"])
    list(offset: number, limit: number, @reflect.type("T") @bind.query() query: T): Promise<T[]> {
        return {} as any
    }

    @route.post("")
    @reflect.type(IdentifierResult, "TID")
    save(@reflect.type("T") data: T): Promise<IdentifierResult<TID>> { return {} as any }

    @route.get(":id")
    @reflect.type("T")
    get(@val.required() @reflect.type("TID") id: TID): Promise<T> { return {} as any }

    @route.put(":id")
    @route.patch(":id")
    @reflect.type(IdentifierResult, "TID")
    modify(@val.required() @reflect.type("TID") id: TID, @reflect.type("T") data: T): Promise<IdentifierResult<TID>> { return {} as any }

    @route.delete(":id")
    @reflect.type(IdentifierResult, "TID")
    delete(@val.required() @reflect.type("TID") id: TID): Promise<IdentifierResult<TID>> { return {} as any }
}

@generic.template("P", "T", "PID", "TID")
class GenericOneToManyController<P, T, PID, TID>{
    protected readonly entityType: Class<T>
    protected readonly parentEntityType: Class<P>
    protected readonly propertyName: string

    constructor() {
        const { types, meta } = getGenericTypeParameters(this)
        this.parentEntityType = types[0]
        this.entityType = types[1]
        const oneToMany = meta.decorators.find((x: OneToManyDecorator): x is OneToManyDecorator => x.kind === "GenericDecoratorOneToMany")
        if (!oneToMany) throw new Error(`Configuration Error: ${this.constructor.name} doesn't decorated with OneToManyDecorator @decorateClass(<OneToManyDecorator>)`)
        this.propertyName = oneToMany.propertyName
    }

    @route.get("")
    @reflect.type(["T"])
    list(@val.required() @reflect.type("PID") pid: PID, offset: number, limit: number, @reflect.type("T") @bind.query() query: T): Promise<T[]> {
        return {} as any
    }

    @route.post("")
    @reflect.type(IdentifierResult, "TID")
    save(@val.required() @reflect.type("PID") pid: PID, @reflect.type("T") data: T): Promise<IdentifierResult<TID>> { return {} as any }

    @route.get(":id")
    @reflect.type("T")
    get(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID): Promise<T> { return {} as any }

    @route.put(":id")
    @route.patch(":id")
    @reflect.type(IdentifierResult, "TID")
    modify(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @reflect.type("T") data: T): Promise<IdentifierResult<TID>> { return {} as any }

    @route.delete(":id")
    @reflect.type(IdentifierResult, "TID")
    delete(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID): Promise<IdentifierResult<TID>> { return {} as any }
}

export { entity, createRoutesFromEntities, GenericController, GenericOneToManyController, IdentifierResult, OneToManyDecorator }