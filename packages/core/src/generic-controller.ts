import reflect, { generic, GenericTypeDecorator, decorateClass, decorate, decorateProperty, PropertyReflection } from 'tinspector'
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
    type: Class,
    parentType: Class
}

interface IdentifierDecorator {
    kind: "GenericDecoratorId",
}


// --------------------------------------------------------------------- //
// ----------------------------- DECORATOR ----------------------------- //
// --------------------------------------------------------------------- //

namespace entity {
    export function oneToMany(propertyName: string, type: Class) {
        return decorate((target: any) => <OneToManyDecorator>{ kind: "GenericDecoratorOneToMany", propertyName, type, parentType: target })
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
    // create IdentifierResult<ID>  
    const IdentifierResultType = generic.create(IdentifierResult, idType)
    // assign IdentifierResult<ID> on each methods: modify, save, delete
    Reflect.decorate([reflect.type(IdentifierResultType)], Controller.prototype, "save", void 0)
    Reflect.decorate([reflect.type(IdentifierResultType)], Controller.prototype, "modify", void 0)
    Reflect.decorate([reflect.type(IdentifierResultType)], Controller.prototype, "delete", void 0)
    // add root decorator
    const name = nameConversion(entity.name)
    Reflect.decorate([route.root(name)], Controller)
    return Controller
}

function createNestedController(dec: OneToManyDecorator, controller: typeof GenericOneToManyController, nameConversion: (x: string) => string) {
    // get type of ID column on parent entity
    const parentIdType = getIdType(dec.parentType)
    // get type of ID column on entity
    const idType = getIdType(dec.type)
    // create controller
    const Controller = generic.create(controller, dec.parentType, dec.type, parentIdType, idType)
    // create IdentifierResult<ID>  
    const IdentifierResultType = generic.create(IdentifierResult, idType)
    // assign IdentifierResult<ID> on each methods: modify, save, delete
    Reflect.decorate([reflect.type(IdentifierResultType)], Controller.prototype, "save", void 0)
    Reflect.decorate([reflect.type(IdentifierResultType)], Controller.prototype, "modify", void 0)
    Reflect.decorate([reflect.type(IdentifierResultType)], Controller.prototype, "delete", void 0)
    // add root decorator
    const name = nameConversion(dec.type.name)
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
@generic.template("T")
class IdentifierResult<TID> {
    constructor(
        public id: TID
    ) { }
}

@generic.template("T", "TID")
class GenericController<T, TID>{
    protected readonly entityType: Class<T> = {} as any
    constructor() {
        const { types } = getGenericTypeParameters(this)
        this.entityType = types[0]
    }

    @route.get("")
    @reflect.type(["T"])
    list(offset: number = 0, limit: number = 50, @reflect.type("T") @bind.query() query: T): Promise<T[]> {
        return {} as any
    }

    @route.post("")
    save(@reflect.type("T") data: T): Promise<IdentifierResult<TID>> { return {} as any}

    @route.get(":id")
    @reflect.type("T")
    get(@val.required() @reflect.type("TID") id: TID) : Promise<T> { return {} as any}

    @route.put(":id")
    @route.patch(":id")
    modify(@val.required() @reflect.type("TID") id: TID, @reflect.type("T") data: T): Promise<IdentifierResult<TID>> { return {} as any}

    @route.delete(":id")
    delete(@val.required() @reflect.type("TID") id: TID): Promise<IdentifierResult<TID>> { return {} as any}
}

@generic.template("P", "T", "PID", "TID")
class GenericOneToManyController<P, T, PID, TID>{
    protected readonly entityType: Class<T> = {} as any
    protected readonly parentEntityType: Class<P> = {} as any
    protected readonly propertyName: string = ""

    constructor() {
        const { types, meta } = getGenericTypeParameters(this)
        this.parentEntityType = types[0]
        this.entityType = types[1]
        const oneToMany = meta.decorators.find((x: OneToManyDecorator): x is OneToManyDecorator => x.kind === "GenericDecoratorOneToMany")!
        this.propertyName = oneToMany.propertyName
    }

    @route.get("")
    @reflect.type(["T"])
    list(@val.required() @reflect.type("PID") pid: PID, offset: number = 0, limit: number = 50, @reflect.type("T") @bind.query() query: T): Promise<T[]> {
        return {} as any
    }

    @route.post("")
    save(@val.required() @reflect.type("PID") pid: PID, @reflect.type("T") data: T): Promise<IdentifierResult<TID>> { return {} as any}

    @route.get(":id")
    @reflect.type("T")
    get(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID):Promise<T> { return {} as any}

    @route.put(":id")
    @route.patch(":id")
    modify(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @reflect.type("T") data: T): Promise<IdentifierResult<TID>> { return {} as any}

    @route.delete(":id")
    delete(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID): Promise<IdentifierResult<TID>> { return {} as any}
}

export { entity, createRoutesFromEntities, GenericController, GenericOneToManyController, IdentifierResult }