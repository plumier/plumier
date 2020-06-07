import reflect, { decorateClass, generic, GenericTypeDecorator, metadata } from "tinspector"
import { val } from "typedconverter"

import { Class } from "./common"
import { api } from "./decorator/api"
import { bind } from "./decorator/bind"
import { domain } from "./decorator/common"
import { route } from "./decorator/route"
import { appendRoute, generateRoutes, IgnoreDecorator, findControllerRecursive } from "./route-generator"
import { HttpStatusError } from "./types"


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

interface InversePropertyDecorator {
    kind: "GenericInverseProperty"
}

interface GenericControllerDecorator {
    kind: "GenericController"
}

interface Repository<T> {
    find(offset: number, limit: number, query: Partial<T>): Promise<T[]>
    insert(data: Partial<T>): Promise<{ id: any }>
    findById(id: any): Promise<T | undefined>
    update(id: any, data: Partial<T>): Promise<{ id: any }>
    delete(id: any): Promise<{ id: any }>
}

interface OneToManyRepository<P, T> {
    find(pid: any, offset: number, limit: number, query: Partial<T>): Promise<T[]>
    insert(pid: any, data: Partial<T>): Promise<{ id: any }>
    findParentById(id: any): Promise<P | undefined>
    findById(id: any): Promise<T | undefined>
    update(id: any, data: Partial<T>): Promise<{ id: any }>
    delete(id: any): Promise<{ id: any }>
}

class ControllerGeneric<T, TID>{
    protected readonly entityType: Class<T>
    constructor() {
        const { types } = getGenericTypeParameters(this)
        this.entityType = types[0]
    }
}

class OneToManyControllerGeneric<P, T, PID, TID>{
    protected readonly entityType: Class<T>
    protected readonly parentEntityType: Class<P>
    protected readonly relation: string

    constructor() {
        const { types, meta } = getGenericTypeParameters(this)
        this.parentEntityType = types[0]
        this.entityType = types[1]
        const oneToMany = meta.decorators.find((x: OneToManyDecorator): x is OneToManyDecorator => x.kind === "GenericDecoratorOneToMany")
        if (!oneToMany) throw new Error(`Configuration Error: ${this.constructor.name} doesn't decorated with OneToManyDecorator @decorateClass(<OneToManyDecorator>)`)
        this.relation = oneToMany.propertyName
    }
}

interface CreateRouteFromEntitiesOption {
    entities: Class[],
    controllerRootPath: string,
    controller: Class<ControllerGeneric<any, any>>,
    oneToManyControllerRootPath: string,
    oneToManyController: Class<OneToManyControllerGeneric<any, any, any, any>>,
    nameConversion: (x: string) => string
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

function getIgnore(entity: Class, property?: string): IgnoreDecorator | undefined {
    const meta = reflect(entity)
    if (property) {
        const prop = meta.properties.find(x => x.name === property)!
        return prop.decorators.find((x: IgnoreDecorator): x is IgnoreDecorator => x.name === "Ignore")
    }
    else
        return meta.decorators.find((x: IgnoreDecorator): x is IgnoreDecorator => x.name === "Ignore")
}

function createController(rootPath: string, entity: Class, controller: Class<ControllerGeneric<any, any>>, nameConversion: (x: string) => string) {
    // get type of ID column on entity
    const idType = getIdType(entity)
    // create controller type dynamically 
    const Controller = generic.create({ parent: controller, name: controller.name }, entity, idType)
    // add root decorator
    const name = nameConversion(entity.name)
    const path = appendRoute(rootPath, name)
    // copy @route.ignore() on entity to the controller to control route generation
    const ignore = getIgnore(entity)
    if (ignore)
        Reflect.decorate([route.ignore(...ignore.methods)], Controller)
    Reflect.decorate([route.root(path)], Controller)
    Reflect.decorate([api.tag(entity.name)], Controller)
    return Controller
}

function createNestedController(rootPath: string, dec: OneToManyDecorator, controller: Class<OneToManyControllerGeneric<any, any, any, any>>, nameConversion: (x: string) => string) {
    const decType = metadata.isCallback(dec.type) ? dec.type({}) : dec.type
    const realType = Array.isArray(decType) ? decType[0] : decType
    // get type of ID column on parent entity
    const parentIdType = getIdType(dec.parentType)
    // get type of ID column on entity
    const idType = getIdType(realType)
    // create controller 
    const Controller = generic.create({ parent: controller, name: controller.name }, dec.parentType, realType, parentIdType, idType)
    // add root decorator
    const name = nameConversion(dec.parentType.name)
    const path = appendRoute(rootPath, `${name}/:pid/${dec.propertyName}`)
    // copy @route.ignore() on entity to the controller to control route generation
    const ignore = getIgnore(dec.parentType, dec.propertyName)
    if (ignore)
        Reflect.decorate([route.ignore(...ignore.methods)], Controller)
    Reflect.decorate([
        route.root(path),
        // re-assign oneToMany decorator which will be used on OneToManyController constructor
        decorateClass(dec)],
        Controller)
    Reflect.decorate([api.tag(dec.parentType.name)], Controller)
    return Controller
}

function createRoutesFromEntities(opt: CreateRouteFromEntitiesOption) {
    const controllers = []
    for (const entity of opt.entities) {
        controllers.push(createController(opt.controllerRootPath, entity, opt.controller, opt.nameConversion))
        const meta = reflect(entity)
        for (const prop of meta.properties) {
            const oneToMany = prop.decorators.find((x: OneToManyDecorator): x is OneToManyDecorator => x.kind === "GenericDecoratorOneToMany")
            if (oneToMany) {
                controllers.push(createNestedController(opt.oneToManyControllerRootPath, { ...oneToMany, propertyName: prop.name }, opt.oneToManyController, opt.nameConversion))
            }
        }
    }
    return generateRoutes(controllers, { overridable: true })
}

function getGenericControllers(rootPath: string | undefined = undefined, controller: string | Class | Class[], defaultController: Class<ControllerGeneric<any, any>>, defaultOneToManyController: Class<OneToManyControllerGeneric<any, any, any, any>>) {
    const result: { root: string, type: Class }[] = []
    const root = rootPath ?? ""
    if (typeof controller === "string") {
        const isController = (x: Class) => x.name.search(/generic$/i) > -1
        const controllers = findControllerRecursive(controller, x => isController(x.type))
            .map(x => ({ ...x, root: rootPath ?? x.root }))
        result.push(...controllers)
    }
    else if (Array.isArray(controller)) {
        result.push(...controller.map(x => ({ root, type: x })))
    }
    else {
        result.push({ root, type: controller })
    }
    const genericController = result.find(x => x.type.prototype instanceof ControllerGeneric) ?? { root, type: defaultController }
    const genericOneToManyController = result.find(x => x.type.prototype instanceof OneToManyControllerGeneric) ?? { root, type: defaultOneToManyController }
    return { genericController, genericOneToManyController }
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
class RepoBaseControllerGeneric<T, TID> extends ControllerGeneric<T, TID>{
    protected readonly repo: Repository<T>
    constructor(fac: ((x: Class<T>) => Repository<T>)) {
        super()
        this.repo = fac(this.entityType)
    }

    @route.ignore()
    private async findByIdOrNotFound(id: TID): Promise<T> {
        const saved = await this.repo.findById(id)
        if (!saved) throw new HttpStatusError(404, `Record with ID ${id} not found`)
        return saved
    }

    @route.get("")
    @reflect.type(["T"])
    list(offset: number = 0, limit: number = 50, @reflect.type("T") @bind.query() @val.partial("T") query: T): Promise<T[]> {
        return this.repo.find(offset, limit, query)
    }

    @route.post("")
    @reflect.type(IdentifierResult, "TID")
    save(@reflect.type("T") data: T): Promise<IdentifierResult<TID>> {
        return this.repo.insert(data)
    }

    @route.get(":id")
    @reflect.type("T")
    get(@val.required() @reflect.type("TID") id: TID): Promise<T> {
        return this.findByIdOrNotFound(id)
    }

    @route.patch(":id")
    @reflect.type(IdentifierResult, "TID")
    async modify(@val.required() @reflect.type("TID") id: TID, @reflect.type("T") @val.partial("T") data: T): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @route.put(":id")
    @reflect.type(IdentifierResult, "TID")
    async replace(@val.required() @reflect.type("TID") id: TID, @reflect.type("T") data: T): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @route.delete(":id")
    @reflect.type(IdentifierResult, "TID")
    async delete(@val.required() @reflect.type("TID") id: TID): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        return this.repo.delete(id)
    }
}

@generic.template("P", "T", "PID", "TID")
class RepoBaseOneToManyControllerGeneric<P, T, PID, TID> extends OneToManyControllerGeneric<P, T, PID, TID>{
    protected readonly repo: OneToManyRepository<P, T>

    constructor(fac: ((p: Class<P>, t: Class<T>, rel: string) => OneToManyRepository<P, T>)) {
        super()
        this.repo = fac(this.parentEntityType, this.entityType, this.relation)
    }

    @route.ignore()
    private async findByIdOrNotFound(id: TID): Promise<T> {
        const saved = await this.repo.findById(id)
        if (!saved) throw new HttpStatusError(404, `Record with ID ${id} not found`)
        return saved
    }

    @route.ignore()
    private async findParentByIdOrNotFound(id: PID): Promise<P> {
        const saved = await this.repo.findParentById(id)
        if (!saved) throw new HttpStatusError(404, `Parent record with ID ${id} not found`)
        return saved
    }

    @route.get("")
    @reflect.type(["T"])
    async list(@val.required() @reflect.type("PID") pid: PID, offset: number = 0, limit: number = 50, @reflect.type("T") @bind.query() @val.partial("T") query: T): Promise<T[]> {
        await this.findParentByIdOrNotFound(pid)
        return this.repo.find(pid, offset, limit, query)
    }

    @route.post("")
    @reflect.type(IdentifierResult, "TID")
    async save(@val.required() @reflect.type("PID") pid: PID, @reflect.type("T") data: T): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        return this.repo.insert(pid, data)
    }

    @route.get(":id")
    @reflect.type("T")
    async get(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID): Promise<T> {
        await this.findParentByIdOrNotFound(pid)
        return this.findByIdOrNotFound(id)
    }

    @route.patch(":id")
    @reflect.type(IdentifierResult, "TID")
    async modify(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @val.partial("T") data: T): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @route.put(":id")
    @reflect.type(IdentifierResult, "TID")
    async replace(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @reflect.type("T") data: T): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        return this.repo.update(id, data)
    }

    @route.delete(":id")
    @reflect.type(IdentifierResult, "TID")
    async delete(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        return this.repo.delete(id)
    }
}

export {
    createRoutesFromEntities, ControllerGeneric,
    OneToManyControllerGeneric, IdentifierResult, OneToManyDecorator, IdentifierDecorator,
    Repository, OneToManyRepository, RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric,
    InversePropertyDecorator, GenericControllerDecorator, getGenericControllers
}