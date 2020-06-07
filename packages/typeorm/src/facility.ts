import {
    Class,
    createRoutesFromEntities,
    crud,
    DefaultFacility,
    getGenericControllers,
    PlumierApplication,
    RouteMetadata,
} from "@plumier/core"
import { isAbsolute, join } from "path"
import pluralize from "pluralize"
import reflect, { noop } from "tinspector"
import { ConnectionOptions, createConnection, getMetadataArgsStorage } from "typeorm"

import { TypeORMControllerGeneric, TypeORMOneToManyControllerGeneric } from "./generic-controller"


interface TypeORMFacilityOption {
    connection?: ConnectionOptions
}

interface CRUDTypeORMFacilityOption extends TypeORMFacilityOption {
    rootPath?: string
    controller?: string | Class | Class[]
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
            if (col.relationType === "many-to-one")
                Reflect.decorate([crud.inverseProperty()], (col.target as Function).prototype, col.propertyName, void 0)
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
            ...opt
        }
    }

    async generateRoutes(app: Readonly<PlumierApplication>): Promise<RouteMetadata[]> {
        const { controller, rootDir } = app.config
        let ctl = typeof controller === "string" && !isAbsolute(controller) ? join(rootDir, controller) : controller
        const { genericController, genericOneToManyController } = getGenericControllers(
            this.crudOpt.rootPath, this.crudOpt.controller ?? ctl,
            TypeORMControllerGeneric, TypeORMOneToManyControllerGeneric
        )
        return createRoutesFromEntities({
            entities: this.entities,
            controller: genericController.type,
            controllerRootPath: genericController.root,
            oneToManyController: genericOneToManyController.type,
            oneToManyControllerRootPath: genericOneToManyController.root,
            nameConversion: x => pluralize.plural(x)
        })
    }
}

export { TypeORMFacility, CRUDTypeORMFacility }


