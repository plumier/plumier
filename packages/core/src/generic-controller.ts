import reflect, { decorateClass, generic, GenericTypeDecorator } from "tinspector"
import { val, convert, VisitorExtension } from "typedconverter"

import { AuthorizeDecorator } from "./authorization"
import { Class, entityHelper } from "./common"
import { api } from "./decorator/api"
import { bind } from "./decorator/bind"
import { domain } from "./decorator/common"
import { RelationDecorator } from "./decorator/entity"
import { GenericControllerDecorator, route } from "./decorator/route"
import { IgnoreDecorator, RouteDecorator } from "./route-generator"
import {
    ControllerGeneric,
    errorMessage,
    GenericController,
    HttpMethod,
    HttpStatusError,
    OneToManyControllerGeneric,
    OneToManyRepository,
    RelationPropertyDecorator,
    Repository,
    MetadataImpl,
} from "./types"
import { Context } from 'koa'
import { BindingDecorator } from './binder'

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
class RepoBaseControllerGeneric<T, TID> implements ControllerGeneric<T, TID>{
    readonly entityType: Class<T>
    readonly repo: Repository<T>

    constructor(fac: ((x: Class<T>) => Repository<T>)) {
        const { types } = getGenericTypeParameters(this)
        this.entityType = types[0]
        this.repo = fac(this.entityType)
    }

    @route.ignore()
    protected async findByIdOrNotFound(id: TID): Promise<T> {
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
    save(@reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        const newData = bindProperties(data, this.entityType, ctx)
        return this.repo.insert(newData)
    }

    @route.get(":id")
    @reflect.type("T")
    get(@val.required() @reflect.type("TID") id: TID): Promise<T> {
        return this.findByIdOrNotFound(id)
    }

    @route.patch(":id")
    @reflect.type(IdentifierResult, "TID")
    async modify(@val.required() @reflect.type("TID") id: TID, @reflect.type("T") @val.partial("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        const newData = bindProperties(data, this.entityType, ctx)
        return this.repo.update(id, newData)
    }

    @route.put(":id")
    @reflect.type(IdentifierResult, "TID")
    async replace(@val.required() @reflect.type("TID") id: TID, @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        const newData = bindProperties(data, this.entityType, ctx)
        return this.repo.update(id, newData)
    }

    @route.delete(":id")
    @reflect.type(IdentifierResult, "TID")
    async delete(@val.required() @reflect.type("TID") id: TID): Promise<IdentifierResult<TID>> {
        await this.findByIdOrNotFound(id)
        return this.repo.delete(id)
    }
}

@generic.template("P", "T", "PID", "TID")
class RepoBaseOneToManyControllerGeneric<P, T, PID, TID> implements OneToManyControllerGeneric<P, T, PID, TID>{
    readonly entityType: Class<T>
    readonly parentEntityType: Class<P>
    readonly relation: string
    readonly repo: OneToManyRepository<P, T>

    constructor(fac: ((p: Class<P>, t: Class<T>, rel: string) => OneToManyRepository<P, T>)) {
        const { types, meta } = getGenericTypeParameters(this)
        this.parentEntityType = types[0]
        this.entityType = types[1]
        const oneToMany = meta.decorators.find((x: RelationPropertyDecorator): x is RelationPropertyDecorator => x.kind === "plumier-meta:relation-prop-name")
        this.relation = oneToMany!.name
        this.repo = fac(this.parentEntityType, this.entityType, this.relation)
    }

    @route.ignore()
    protected async findByIdOrNotFound(id: TID): Promise<T> {
        const saved = await this.repo.findById(id)
        if (!saved) throw new HttpStatusError(404, `Record with ID ${id} not found`)
        return saved
    }

    @route.ignore()
    protected async findParentByIdOrNotFound(id: PID): Promise<P> {
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
    async save(@val.required() @reflect.type("PID") pid: PID, @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        const newData = bindProperties(data, this.entityType, ctx)
        return this.repo.insert(pid, newData)
    }

    @route.get(":id")
    @reflect.type("T")
    async get(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID): Promise<T> {
        await this.findParentByIdOrNotFound(pid)
        return this.findByIdOrNotFound(id)
    }

    @route.patch(":id")
    @reflect.type(IdentifierResult, "TID")
    async modify(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @val.partial("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        const newData = bindProperties(data, this.entityType, ctx)
        return this.repo.update(id, newData)
    }

    @route.put(":id")
    @reflect.type(IdentifierResult, "TID")
    async replace(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID, @reflect.type("T") data: T, @bind.ctx() ctx: Context): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        const newData = bindProperties(data, this.entityType, ctx)
        return this.repo.update(id, newData)
    }

    @route.delete(":id")
    @reflect.type(IdentifierResult, "TID")
    async delete(@val.required() @reflect.type("PID") pid: PID, @val.required() @reflect.type("TID") id: TID): Promise<IdentifierResult<TID>> {
        await this.findParentByIdOrNotFound(pid)
        await this.findByIdOrNotFound(id)
        return this.repo.delete(id)
    }
}

class DefaultRepository<T> implements Repository<T> {
    find(offset: number, limit: number, query: Partial<T>): Promise<T[]> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    insert(data: Partial<T>): Promise<{ id: any }> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    findById(id: any): Promise<T | undefined> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    update(id: any, data: Partial<T>): Promise<{ id: any }> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    delete(id: any): Promise<{ id: any }> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
}

class DefaultOneToManyRepository<P, T> implements OneToManyRepository<P, T> {
    find(pid: any, offset: number, limit: number, query: Partial<T>): Promise<T[]> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    insert(pid: any, data: Partial<T>): Promise<{ id: any }> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    findParentById(id: any): Promise<P | undefined> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    findById(id: any): Promise<T | undefined> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    update(id: any, data: Partial<T>): Promise<{ id: any }> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
    delete(id: any): Promise<{ id: any }> {
        throw new Error(errorMessage.GenericControllerImplementationNotFound)
    }
}

@generic.template("T", "TID")
@generic.type("T", "TID")
class DefaultControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
    constructor() { super(x => new DefaultRepository()) }
}

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
class DefaultOneToManyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID>{
    constructor() { super(x => new DefaultOneToManyRepository()) }
}

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

const genericControllerRegistry = new Map<Class, boolean>()

function updateGenericControllerRegistry(cls: Class) {
    genericControllerRegistry.set(cls, true)
}

function getGenericTypeParameters(cls: any) {
    const controller: Class = cls.constructor
    const meta = reflect(controller)
    const genericDecorator = meta.decorators
        .find((x: GenericTypeDecorator): x is GenericTypeDecorator => x.kind == "GenericType" && x.target === controller)
    return {
        types: genericDecorator!.types.map(x => x as Class),
        meta
    }
}

function copyDecorators(decorators: any[], controller: Class) {
    const result = []
    for (const decorator of decorators) {
        // copy @route.ignore()
        if ((decorator as IgnoreDecorator).name === "plumier-meta:ignore") {
            result.push(decorator)
        }
        // copy @authorize
        const authDec = (decorator as AuthorizeDecorator)
        if (authDec.type === "plumier-meta:authorize") {
            // @authorize.role() should applied to all actions 
            if (authDec.access === "all") {
                result.push(decorator)
                continue
            }
            const meta = reflect(controller)
            const findAction = (...methods: HttpMethod[]) => {
                const result = []
                for (const action of meta.methods) {
                    if (action.decorators.some((x: RouteDecorator) => x.name === "plumier-meta:route"
                        && methods.some(m => m === x.method)))
                        result.push(action.name)
                }
                return result
            }
            // add extra action filter for decorator @authorize.read() and @authorize.write() 
            // get will only applied to actions with GET method 
            // set will only applied to actions with mutation DELETE, PATCH, POST, PUT
            if (authDec.access === "read") {
                authDec.action = findAction("get")
                result.push(decorator)
            }
            if (authDec.access === "write") {
                authDec.action = findAction("delete", "patch", "post", "put")
                result.push(decorator)
            }
        }
    }
    //reflect(ctl, { flushCache: true })
    return result.map(x => decorateClass(x))
}

function createGenericController(entity: Class, controller: Class<ControllerGeneric>, nameConversion: (x: string) => string) {
    // get type of ID column on entity
    const idType = entityHelper.getIdType(entity)
    // create controller type dynamically 
    const Controller = generic.create({ parent: controller, name: controller.name }, entity, idType)
    // add root decorator
    const name = nameConversion(entity.name)
    // copy @route.ignore() and @authorize on entity to the controller to control route generation
    const meta = reflect(entity)
    const decorators = copyDecorators(meta.decorators, controller)
    Reflect.decorate([...decorators, route.root(name), api.tag(entity.name)], Controller)
    return Controller
}

function createOneToManyGenericController(entity: Class, relation: Class, relationProperty: string, controller: Class<OneToManyControllerGeneric>, nameConversion: (x: string) => string) {
    // get type of ID column on parent entity
    const parentIdType = entityHelper.getIdType(entity)
    // get type of ID column on entity
    const idType = entityHelper.getIdType(relation)
    // create controller 
    const Controller = generic.create({ parent: controller, name: controller.name }, entity, relation, parentIdType, idType)
    // add root decorator
    const name = `${nameConversion(entity.name)}/:pid/${relationProperty}`
    // copy @route.ignore() on entity to the controller to control route generation
    const meta = reflect(entity)
    const entityDecorators = meta.properties.find(x => x.name === relationProperty)!.decorators
    const decorators = copyDecorators(entityDecorators, controller)
    Reflect.decorate([
        ...decorators,
        route.root(name),
        api.tag(entity.name),
        // re-assign oneToMany decorator which will be used on OneToManyController constructor
        decorateClass(<RelationPropertyDecorator>{ kind: "plumier-meta:relation-prop-name", name: relationProperty }),
    ], Controller)
    return Controller
}


function createGenericControllers(controller: Class, genericControllers: GenericController, nameConversion: (x: string) => string) {
    const setting = genericControllerRegistry.get(controller)
    const meta = reflect(controller)
    const controllers = []
    // basic generic controller
    const basicDecorator = meta.decorators.find((x: GenericControllerDecorator): x is GenericControllerDecorator => x.name === "plumier-meta:controller")
    if (basicDecorator) {
        const ctl = createGenericController(controller, genericControllers[0], nameConversion)
        controllers.push(ctl)
    }
    // one to many controller on each relation property
    const relations = []
    for (const prop of meta.properties) {
        const decorator = prop.decorators.find((x: GenericControllerDecorator): x is GenericControllerDecorator => x.name === "plumier-meta:controller")
        if (!decorator) continue
        relations.push({ name: prop.name, type: prop.type[0], decorator })
    }
    for (const relation of relations) {
        const ctl = createOneToManyGenericController(controller, relation.type, relation.name, genericControllers[1], nameConversion)
        controllers.push(ctl)
    }
    return controllers
}

function getGenericControllerOneToOneRelations(type: Class) {
    const meta = reflect(type)
    const result = []
    for (const prop of meta.properties) {
        if (prop.decorators.find((x: RelationDecorator) => x.kind === "plumier-meta:relation") && prop.typeClassification !== "Array") {
            result.push(prop)
        }
    }
    return result
}

function bindProperties(value: any, type: Class, ctx: Context) {
    const meta = reflect(type)
    return meta.properties.reduce((prev, prop) => {
        const binder = prop.decorators.find((x: BindingDecorator): x is BindingDecorator => x.type === "ParameterBinding")
        const result = !binder ? value[prop.name] :
            binder.process(ctx, new MetadataImpl(undefined, ctx.route!, { ...prop, parent: type }))
        if(result !== undefined)
            prev[prop.name] = result
        return prev
    }, {} as any)
}

export {
    IdentifierResult, createGenericControllers, genericControllerRegistry, updateGenericControllerRegistry,
    RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric, getGenericControllerOneToOneRelations,
    DefaultControllerGeneric, DefaultOneToManyControllerGeneric, DefaultRepository, DefaultOneToManyRepository
}
