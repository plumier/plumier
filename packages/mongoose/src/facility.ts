import {
    createRoutesFromEntities,
    DefaultFacility,
    getGenericControllers,
    isCustomClass,
    PlumierApplication,
    api,
    crud,
} from "@plumier/core"
import Mongoose from "mongoose"
import { isAbsolute, join } from "path"
import pluralize from "pluralize"
import { Result, VisitorInvocation } from "typedconverter"

import { models } from "./generator"
import { MongooseControllerGeneric, MongooseOneToManyControllerGeneric } from "./generic-controller"
import { CRUDMongooseFacilityOption, MongooseFacilityOption, RefDecorator } from "./types"
import reflect, { TypeDecorator} from "tinspector"



function safeToString(obj: any) {
    try {
        return obj.toString()
    }
    catch {
        return ""
    }
}

function relationToObjectIdVisitor(i: VisitorInvocation): Result {
    const id = safeToString(i.value)
    if (Mongoose.isValidObjectId(id) && isCustomClass(i.type)) {
        return Result.create(Mongoose.Types.ObjectId(id))
    }
    else
        return i.proceed()
}

export class MongooseFacility extends DefaultFacility {
    option: MongooseFacilityOption
    constructor(opts?: MongooseFacilityOption) {
        super()
        this.option = { ...opts }
    }

    async initialize(app: Readonly<PlumierApplication>) {
        app.set({ typeConverterVisitors: [relationToObjectIdVisitor] })
        const uri = this.option.uri ?? process.env.PLUM_MONGODB_URI
        if (uri)
            await Mongoose.connect(uri, { useNewUrlParser: true })
    }
}

export class CRUDMongooseFacility extends MongooseFacility {
    option: CRUDMongooseFacilityOption
    constructor(opt?: CRUDMongooseFacilityOption) {
        super(opt)
        this.option = { ...opt }
    }

    async generateRoutes(app: Readonly<PlumierApplication>) {
        const { controller, rootDir } = app.config
        let ctl = typeof controller === "string" && !isAbsolute(controller) ? join(rootDir, controller) : controller
        const { genericController, genericOneToManyController } = getGenericControllers(
            this.option.rootPath, this.option.controller ?? ctl,
            MongooseControllerGeneric, MongooseOneToManyControllerGeneric
        )
        const entities = Array.from(models.keys())
        for (const entity of entities) {
            const meta = reflect(entity)
            for (const property of meta.properties) {
                if (["id", "createdAt", "updatedAt"].some(x => property.name === x)) {
                    Reflect.decorate([api.params.readOnly()], entity.prototype, property.name)
                }
                if (property.decorators.find((x: RefDecorator) => x.name === "MongooseRef")) {
                    const ovr = property.decorators.find((x:TypeDecorator):x is TypeDecorator => x.kind === "Override")!
                    Reflect.decorate([crud.oneToMany(ovr.type as any), api.params.readOnly(), api.params.writeOnly()], entity.prototype, property.name)
                }
            }
            reflect(entity, { flushCache: true })
        }
        return createRoutesFromEntities({
            entities,
            controller: genericController.type,
            controllerRootPath: genericController.root,
            oneToManyController: genericOneToManyController.type,
            oneToManyControllerRootPath: genericOneToManyController.root,
            nameConversion: x => pluralize.plural(x)
        })
    }
}