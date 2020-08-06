import {
    api,
    Class,
    DefaultFacility,
    findClassRecursive,
    findFilesRecursive,
    PlumierApplication,
    primaryId,
    relation,
    RelationDecorator,
    entityHelper,
    authorize,
} from "@plumier/core"
import { GenericControllerFacility, GenericControllerFacilityOption } from "@plumier/generic-controller"
import reflect, { noop } from "tinspector"
import { ConnectionOptions, createConnection, getMetadataArgsStorage } from "typeorm"
import { MetadataArgsStorage } from "typeorm/metadata-args/MetadataArgsStorage"

import { TypeORMControllerGeneric, TypeORMOneToManyControllerGeneric } from "./generic-controller"
import { ResultMessages, Result, VisitorInvocation } from 'typedconverter'
import validator from "validator"

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

class TypeORMFacility extends DefaultFacility {
    protected entities: Class[] = []
    private option: TypeORMFacilityOption;
    constructor(opt?: TypeORMFacilityOption) {
        super()
        this.option = { ...opt }
    }

    setup(app: Readonly<PlumierApplication>) {
        // set type converter module to allow updating relation by id
        app.set({ typeConverterVisitors: [validateRelation] })
        // load all entities to be able to take the metadata storage
        if (this.option.connection?.entities) {
            for (const entity of this.option.connection.entities) {
                if (typeof entity === "string") {
                    const files = findFilesRecursive(entity)
                    for (const file of files) {
                        require(file)
                    }
                }
            }
        }
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
        const entities = getMetadataArgsStorage().tables.map(x => x.target as Class)
        if (!opt) {
            return { entities }
        }
        else
            return { entities, ...opt, }
    }

    constructor(opt?: Partial<GenericControllerFacilityOption>) {
        super(TypeORMGenericControllerFacility.getDefaultOpt(opt))
    }


    protected getEntities(entities: string | Class | Class[]): Class[] {
        if (typeof entities === "function") {
            const storage = getMetadataArgsStorage();
            if (!storage.tables.some(x => x.target === entities)) return []
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


