import { api, Class, DefaultFacility, findClassRecursive, isCustomClass, PlumierApplication } from "@plumier/core"
import { crud, GenericControllerFacility, GenericControllerFacilityOption } from "@plumier/generic-controller"
import Mongoose from "mongoose"
import reflect, { PropertyReflection, TypeDecorator } from "tinspector"
import { Result, VisitorInvocation } from "typedconverter"

import { getModels } from "./generator"
import { MongooseControllerGeneric, MongooseOneToManyControllerGeneric } from "./generic-controller"
import { MongooseFacilityOption, RefDecorator } from "./types"

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

export class MongooseGenericControllerFacility extends GenericControllerFacility {
    protected defaultController = MongooseControllerGeneric
    protected defaultOneToManyController = MongooseOneToManyControllerGeneric

    private static defaultOptions(opt?: Partial<GenericControllerFacilityOption>): GenericControllerFacilityOption {
        const entities = getModels()
        if (!opt) {
            return { entities }
        }
        else
            return { entities, ...opt, }
    }

    constructor(opt?: Partial<GenericControllerFacilityOption>) {
        super(MongooseGenericControllerFacility.defaultOptions(opt))
    }

    private assignDecorators(entity: Class, property: PropertyReflection) {
        if (["id", "createdAt", "updatedAt"].some(x => property.name === x)) {
            Reflect.decorate([api.params.readOnly()], entity.prototype, property.name)
        }
        if (property.decorators.find((x: RefDecorator) => x.name === "MongooseRef")) {
            const ovr = property.decorators.find((x: TypeDecorator): x is TypeDecorator => x.kind === "Override")!
            Reflect.decorate([crud.oneToMany(ovr.type as any), api.params.readOnly(), api.params.writeOnly()], entity.prototype, property.name)
        }
    }

    protected getEntities(entities: string | Class | Class[]): Class[] {
        if (typeof entities === "function") {
            // const registered = Array.from(models.keys())
            // if (!registered.some(x => x === entities)) return []
            const meta = reflect(entities)
            for (const property of meta.properties) {
                this.assignDecorators(entities, property)
            }
            reflect(entities, { flushCache: true })
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