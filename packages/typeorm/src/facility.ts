import {
    authorize,
    Class,
    DefaultFacility,
    entityHelper,
    findClassRecursive,
    PlumierApplication,
    primaryId,
    relation,
    RelationDecorator,
    api,
    findFilesRecursive,
} from "@plumier/core"
import { GenericControllerFacility, GenericControllerFacilityOption } from "@plumier/generic-controller"
import reflect, { noop } from "tinspector"
import { Result, ResultMessages, VisitorInvocation } from "typedconverter"
import { ConnectionOptions, createConnection, getMetadataArgsStorage, getConnectionOptions, EntitySchema } from "typeorm"
import validator from "validator"
import { lstatSync } from "fs"
import glob from "glob"


import { TypeORMControllerGeneric, TypeORMOneToManyControllerGeneric } from "./generic-controller"

interface TypeORMFacilityOption {
    connection?: ConnectionOptions
}

function convertValue(value: any, path: string, type: Class): Result {
    if (Array.isArray(value)) {
        const messages: ResultMessages[] = []
        const values = []
        for (const [i, item] of value.entries()) {
            const converted = convertValue(item, `${path}[${i}]`, type)
            values.push(converted.value)
            if (converted.issues)
                messages.push(...converted.issues)
        }
        return { value: values, issues: messages.length > 0 ? messages : undefined }
    }
    else {
        const prop = entityHelper.getIdProp(type)!
        // usually ID will be of type Number and String (UUID)
        if (prop.type === Number) {
            const result = Number(value + "")
            if (isNaN(result)) return Result.error(value, path, "Value must be a number")
        }
        if (prop.type === String) {
            const valid = validator.isUUID(value + "")
            if (!valid) return Result.error(value, path, "Value must be an UUID")
        }
        // return { id: <id> } to make TypeOrm able to convert it into proper relation
        return Result.create({ [prop.name]: value })
    }
}

function validateRelation(i: VisitorInvocation): Result {
    if (i.value && i.decorators.find((x: RelationDecorator) => x.kind === "plumier-meta:relation"))
        return convertValue(i.value, i.path, i.type)
    else
        return i.proceed()
}

async function loadEntities(entities?: ((Function | string | EntitySchema<any>))[]) {
    if (!entities) return
    for (const entity of entities) {
        if (typeof entity !== "string") continue
        const files = glob.sync(entity)
        for (const file of files) {
            const stat = lstatSync(file)
            if (stat.isDirectory()) {
                const files = findFilesRecursive(file)
                for (const f of files) {
                    require(f)
                }
            }
            else
                require(file)
        }
    }
}

class TypeORMFacility extends DefaultFacility {
    protected entities: Class[] = []
    private option: TypeORMFacilityOption;
    constructor(opt?: TypeORMFacilityOption) {
        super()
        this.option = { ...opt }
    }

    private async getConnection() {
        if (this.option.connection)
            return this.option.connection
        else
            return getConnectionOptions()
    }

    async setup(app: Readonly<PlumierApplication>) {
        // set type converter module to allow updating relation by id
        app.set({ typeConverterVisitors: [validateRelation] })
        try {
            const { entities } = await this.getConnection()
            // load all entities to be able to take the metadata storage
            await loadEntities(entities)
        }
        // just skip error in setup method 
        // it will caught properly during db connect on initialize
        catch { }
        // assign tinspector decorators, so Plumier can understand the entity metadata
        const storage = getMetadataArgsStorage();
        for (const col of storage.columns) {
            Reflect.decorate([noop()], (col.target as Function).prototype, col.propertyName, void 0)
            if (col.options.primary)
                Reflect.decorate([primaryId(), authorize.readonly()], (col.target as Function).prototype, col.propertyName, void 0)
        }
        for (const col of storage.relations) {
            const rawType: Class = (col as any).type()
            const type = col.relationType === "one-to-many" || col.relationType === "many-to-many" ? [rawType] : rawType
            Reflect.decorate([reflect.type(x => type)], (col.target as Function).prototype, col.propertyName, void 0)
            if (col.relationType === "many-to-one")
                Reflect.decorate([relation({ inverse: true })], (col.target as Function).prototype, col.propertyName, void 0)
            else
                Reflect.decorate([relation()], (col.target as Function).prototype, col.propertyName, void 0)
        }
        this.entities = storage.tables.filter(x => typeof x.target !== "string").map(x => x.target as Class)
    }

    async initialize() {
        if (this.option.connection)
            await createConnection(this.option.connection)
        else
            await createConnection()
    }
}

class TypeORMGenericControllerFacility extends GenericControllerFacility {
    protected defaultController = TypeORMControllerGeneric
    protected defaultOneToManyController = TypeORMOneToManyControllerGeneric

    private static getDefaultOpt(opt?: Partial<GenericControllerFacilityOption>): GenericControllerFacilityOption {
        if (opt?.entities)
            return { ...opt, entities: opt.entities }
        else {
            const entities = getMetadataArgsStorage().tables.map(x => x.target as Class)
            return { ...opt, entities }
        }
    }

    constructor(opt?: Partial<GenericControllerFacilityOption>) {
        super(TypeORMGenericControllerFacility.getDefaultOpt(opt))
    }

    setup() { }

    protected getEntities(entities: string | Class | Class[]): Class[] {
        if (typeof entities === "function") {
            const storage = getMetadataArgsStorage();
            if (!storage.tables.some(x => x.target === entities)) return []
            const col = storage.relations.find(x => x.target === entities)
            if (col && ["one-to-many", "many-to-many", "many-to-one"].some(x => col.relationType === x)) {
                // set relation to readonly and writeonly and should be populated using API /parent/pid/child
                Reflect.decorate([api.readonly(), api.writeonly()], (col.target as Function).prototype, col.propertyName, void 0)
            }
            return [entities]
        }
        else if (Array.isArray(entities)) {
            const result = []
            for (const entity of entities) {
                result.push(...this.getEntities(entity))
            }
            return result;
        }
        else {
            const classes = findClassRecursive(entities, x => true).map(x => x.type)
            return this.getEntities(classes)
        }
    }
}

export { TypeORMFacility, TypeORMGenericControllerFacility }


