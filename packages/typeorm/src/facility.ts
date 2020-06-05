import { Class, createRoutesFromEntities, DefaultFacility, crud, RouteMetadata, GenericController, GenericOneToManyController } from "@plumier/core"
import pluralize from "pluralize"
import reflect, { noop } from "tinspector"
import { ConnectionOptions, createConnection, getMetadataArgsStorage } from "typeorm"

import { TypeOrmGenericController, TypeOrmGenericOneToManyController } from "."


interface TypeORMFacilityOption {
    connection?: ConnectionOptions
}

interface CRUDTypeORMFacilityOption extends TypeORMFacilityOption {
    rootPath: string
    genericController: Class<GenericController<any, any>>
    genericOneToManyController: Class<GenericOneToManyController<any, any, any, any>>
}


class TypeORMFacility extends DefaultFacility {
    protected entities: Class[] = []
    private option: TypeORMFacilityOption;
    constructor(opt?: TypeORMFacilityOption) {
        super()
        this.option = { ...opt }
    }

    setup() {
        const storage = getMetadataArgsStorage();
        for (const col of storage.generations) {
            Reflect.decorate([crud.id()], (col.target as Function).prototype, col.propertyName, void 0)
        }
        for (const col of storage.columns) {
            Reflect.decorate([noop()], (col.target as Function).prototype, col.propertyName, void 0)
        }
        for (const col of storage.relations) {
            const rawType: Class = (col as any).type()
            const type = col.relationType === "one-to-many" || col.relationType === "many-to-many" ? [rawType] : rawType
            Reflect.decorate([reflect.type(x => type)], (col.target as Function).prototype, col.propertyName, void 0)
            if (col.relationType === "one-to-many")
                Reflect.decorate([crud.oneToMany(x => rawType)], (col.target as Function).prototype, col.propertyName, void 0)
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

class CRUDTypeORMFacility extends TypeORMFacility {
    private crudOpt: CRUDTypeORMFacilityOption
    constructor(opt?: Partial<CRUDTypeORMFacilityOption>) {
        super(opt)
        this.crudOpt = {
            rootPath: "",
            genericController: TypeOrmGenericController,
            genericOneToManyController: TypeOrmGenericOneToManyController,
            ...opt
        }
    }

    async generateRoutes(): Promise<RouteMetadata[]> {
        return createRoutesFromEntities(this.crudOpt.rootPath,
            this.entities, this.crudOpt.genericController,
            this.crudOpt.genericOneToManyController, x => pluralize.plural(x))
    }
}

export { TypeORMFacility, CRUDTypeORMFacility }


