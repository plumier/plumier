import { Class, createRoutesFromEntities, DefaultFacility, entity, RouteMetadata } from "@plumier/core"
import pluralize from "pluralize"
import reflect, { noop } from "tinspector"
import { ConnectionOptions, createConnection, getMetadataArgsStorage } from "typeorm"

import { TypeOrmGenericController, TypeOrmGenericOneToManyController } from "."

class TypeORMFacility extends DefaultFacility {
    protected entities: Class[] = []
    constructor(private option?: ConnectionOptions) { super() }

    setup() {
        const storage = getMetadataArgsStorage();
        for (const col of storage.generations) {
            Reflect.decorate([entity.id()], (col.target as Function).prototype, col.propertyName, void 0)
        }
        for (const col of storage.columns) {
            Reflect.decorate([noop()], (col.target as Function).prototype, col.propertyName, void 0)
        }
        for (const col of storage.relations) {
            const rawType: Class = (col as any).type()
            const type = col.relationType === "one-to-many" || col.relationType === "many-to-many" ? [rawType] : rawType
            Reflect.decorate([reflect.type(x => type)], (col.target as Function).prototype, col.propertyName, void 0)
            if (col.relationType === "one-to-many")
                Reflect.decorate([entity.oneToMany(x => rawType)], (col.target as Function).prototype, col.propertyName, void 0)
        }
        this.entities = storage.tables.filter(x => typeof x.target !== "string").map(x => x.target as Class)
    }

    async initialize() {
        if (this.option)
            await createConnection(this.option)
        else
            await createConnection()
    }
}

class CRUDTypeORMFacility extends TypeORMFacility {
    async generateRoutes(): Promise<RouteMetadata[]> {
        return createRoutesFromEntities(this.entities, TypeOrmGenericController, TypeOrmGenericOneToManyController, x => pluralize.plural(x))
    }
}

export { TypeORMFacility, CRUDTypeORMFacility }


