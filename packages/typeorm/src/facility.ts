import { api, Class, DefaultFacility, findClassRecursive, primaryId, relation, PlumierApplication, findFilesRecursive } from "@plumier/core"
import { GenericControllerFacility, GenericControllerFacilityOption } from "@plumier/generic-controller"
import reflect, { noop } from "tinspector"
import { ConnectionOptions, createConnection, getMetadataArgsStorage } from "typeorm"
import { MetadataArgsStorage } from "typeorm/metadata-args/MetadataArgsStorage"

import { TypeORMControllerGeneric, TypeORMOneToManyControllerGeneric } from "./generic-controller"
import { join, isAbsolute } from "path"

interface TypeORMFacilityOption {
    connection?: ConnectionOptions
}

class TypeORMFacility extends DefaultFacility {
    protected entities: Class[] = []
    private option: TypeORMFacilityOption;
    constructor(opt?: TypeORMFacilityOption) {
        super()
        this.option = { ...opt }
    }

    setup(app: Readonly<PlumierApplication>) {
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
        for (const col of storage.generations) {
            Reflect.decorate([noop()], (col.target as Function).prototype, col.propertyName, void 0)
        }
        for (const col of storage.columns) {
            Reflect.decorate([noop()], (col.target as Function).prototype, col.propertyName, void 0)
        }
        for (const col of storage.relations) {
            const rawType: Class = (col as any).type()
            const type = col.relationType === "one-to-many" || col.relationType === "many-to-many" ? [rawType] : rawType
            Reflect.decorate([reflect.type(x => type)], (col.target as Function).prototype, col.propertyName, void 0)
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

    private assignDecorators(entity: Class, storage: MetadataArgsStorage) {
        // decorate entities to match with required CRUD specs 
        // also add decorators to make some property readOnly or writeOnly on Open API generation
        for (const col of storage.generations) {
            if (col.target === entity) {
                Reflect.decorate([primaryId(), api.readonly()], (col.target as Function).prototype, col.propertyName, void 0)
                break;
            }
        }
        for (const col of storage.relations) {
            const rawType: Class = (col as any).type()
            if (rawType === entity) {
                if (col.relationType === "one-to-many")
                    Reflect.decorate([relation(), api.readonly(), api.writeonly()], (col.target as Function).prototype, col.propertyName, void 0)
                if (col.relationType === "many-to-one")
                    Reflect.decorate([relation({ inverse: true }), api.readonly(), api.writeonly()], (col.target as Function).prototype, col.propertyName, void 0)
                break;
            }
        }
    }

    protected getEntities(entities: string | Class | Class[]): Class[] {
        if (typeof entities === "function") {
            const storage = getMetadataArgsStorage();
            if (!storage.tables.some(x => x.target === entities)) return []
            this.assignDecorators(entities, storage)
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


