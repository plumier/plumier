
import { DefaultFacility, Class } from "@plumier/core"
import { getMetadataArgsStorage, ConnectionOptions, createConnection } from "typeorm"
import { noop } from "tinspector"

export class TypeOrmFacility extends DefaultFacility {
    constructor(private option?: ConnectionOptions) { super() }

    setup() {
        const storage = getMetadataArgsStorage();
        for (const col of storage.columns) {
            Reflect.decorate([noop()], (col.target as Function).prototype, col.propertyName, void 0)
        }
        for (const col of storage.relations) {
            const rawType: Class = (col.type as Function)()
            const type = col.relationType === "one-to-many" || col.relationType === "many-to-many" ? [rawType] : rawType
            Reflect.decorate([noop(x => type)], (col.target as Function).prototype, col.propertyName, void 0)
        }
    }

    async initialize() {
        if (this.option)
            await createConnection(this.option)
        else 
            await createConnection()
    }
}