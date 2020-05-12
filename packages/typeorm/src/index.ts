
import { DefaultFacility } from "@plumier/core"
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
            Reflect.decorate([noop()], (col.target as Function).prototype, col.propertyName, void 0)
        }
    }

    async initialize() {
        if (this.option)
            await createConnection(this.option)
    }
}