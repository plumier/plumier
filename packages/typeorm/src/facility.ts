import {
    api,
    authorize,
    Class,
    DefaultFacility,
    entity,
    entityHelper,
    filterConverters,
    findFilesRecursive,
    genericControllerRegistry,
    globAsync,
    PlumierApplication,
    RelationDecorator,
    RequestHookMiddleware,
} from "@plumier/core"
import { lstat } from "fs"
import pluralize from "pluralize"
import reflect, { noop } from "tinspector"
import { Result, ResultMessages, VisitorInvocation } from "typedconverter"
import { ConnectionOptions, createConnection, getConnectionOptions, getManager, getMetadataArgsStorage } from "typeorm"
import { promisify } from "util"
import validator from "validator"

import { TypeORMControllerGeneric, TypeORMOneToManyControllerGeneric } from "./generic-controller"

const lstatAsync = promisify(lstat)


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

function relationConverter(i: VisitorInvocation): Result {
    if (i.value && i.decorators.find((x: RelationDecorator) => x.kind === "plumier-meta:relation"))
        return convertValue(i.value, i.path, i.type)
    else
        return i.proceed()
}

// load all entities to be able to take the metadata storage
async function loadEntities(connection?: ConnectionOptions) {
    try {
        const { entities } = connection ?? await getConnectionOptions()
        if (!entities) return
        for (const entity of entities) {
            if (typeof entity !== "string") continue
            const files = await globAsync(entity, { absolute: true })
            for (const file of files) {
                const stat = await lstatAsync(file)
                if (stat.isDirectory()) {
                    const files = await findFilesRecursive(file)
                    for (const f of files) {
                        require(f)
                    }
                }
                else
                    require(file)
            }
        }
    }
    // just skip error in setup method 
    // it will caught properly during db connect on initialize
    catch { }
}

class TypeORMFacility extends DefaultFacility {
    private option: TypeORMFacilityOption;
    constructor(opt?: TypeORMFacilityOption) {
        super()
        this.option = { ...opt }
    }

    async preInitialize(app: Readonly<PlumierApplication>) {
        // set type converter module to allow updating relation by id
        app.set({ typeConverterVisitors: [...app.config.typeConverterVisitors, relationConverter, ...filterConverters] })
        // load all entities to be able to take the metadata storage
        await loadEntities(this.option.connection)
        // assign tinspector decorators, so Plumier can understand the entity metadata
        const storage = getMetadataArgsStorage();
        if(storage.tables.length === 0){
            throw new Error("No TypeORM entity found, check your connection configuration")
        }
        for (const col of storage.columns) {
            Reflect.decorate([noop()], (col.target as Function).prototype, col.propertyName, void 0)
            if (col.options.primary)
                Reflect.decorate([entity.primaryId(), authorize.readonly()], (col.target as Function).prototype, col.propertyName, void 0)
        }
        for (const col of storage.relations) {
            const rawType: Class = (col as any).type()
            const type = col.relationType === "one-to-many" || col.relationType === "many-to-many" ? [rawType] : rawType
            Reflect.decorate([reflect.type(x => type)], (col.target as Function).prototype, col.propertyName, void 0)
            if (col.relationType === "many-to-one") {
                // TODO
                Reflect.decorate([entity.relation({ inverse: true })], (col.target as Function).prototype, col.propertyName, void 0)
            }
            else {
                const cache = genericControllerRegistry.get(rawType)
                // if entity handled with generic controller then hide all one to many relation
                if (cache)
                    Reflect.decorate([api.readonly(), api.writeonly()], (col.target as Function).prototype, col.propertyName, void 0)
                Reflect.decorate([entity.relation()], (col.target as Function).prototype, col.propertyName, void 0)
            }
        }
    }

    setup(app: Readonly<PlumierApplication>) {
        app.set({genericController: [TypeORMControllerGeneric, TypeORMOneToManyControllerGeneric]})
        app.set({genericControllerNameConversion: (x: string) => pluralize(x)})
        app.set({entityProviderQuery: async (type, id) => {
            const repo = getManager().getRepository(type)
            return repo.findOne(id)
        }})
        app.use(new RequestHookMiddleware(), "Action")
    }

    async initialize(app: Readonly<PlumierApplication>) {
        if (this.option.connection)
            await createConnection(this.option.connection)
        else
            await createConnection()
    }
}

export { TypeORMFacility }


