import { api, Class, DefaultFacility, findClassRecursive, isCustomClass, PlumierApplication, ActionContext, MiddlewareFunction } from "@plumier/core"
import { crud, GenericControllerFacility, GenericControllerFacilityOption } from "@plumier/generic-controller"
import Mongoose from "mongoose"
import reflect, { PropertyReflection, TypeDecorator } from "tinspector"
import convert, { Result, VisitorInvocation } from "typedconverter"

import { getModels, MongooseHelper } from "./generator"
import { MongooseControllerGeneric, MongooseOneToManyControllerGeneric } from "./generic-controller"
import { RefDecorator, ClassOptionDecorator } from "./types"

interface MongooseFacilityOption { uri?: string, helper?: MongooseHelper }

function safeToString(obj: any) {
    try {
        return obj.toString()
    }
    catch {
        return ""
    }
}

function validateObjectId(i: VisitorInvocation): Result {
    const id = safeToString(i.value)
    if (Mongoose.isValidObjectId(id) && isCustomClass(i.type)) {
        return Result.create(id)
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
        app.set({ typeConverterVisitors: [validateObjectId] })
        const uri = this.option.uri ?? process.env.PLUM_MONGODB_URI
        if (uri) {
            if (this.option.helper)
                await this.option.helper.connect(uri)
            else
                await Mongoose.connect(uri)
        }
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
            Reflect.decorate([api.readOnly()], entity.prototype, property.name)
        }
        if (property.decorators.find((x: RefDecorator) => x.name === "MongooseRef")) {
            const ovr = property.decorators.find((x: TypeDecorator): x is TypeDecorator => x.kind === "Override")!
            Reflect.decorate([crud.oneToMany(ovr.type as any), api.readOnly(), api.writeOnly()], entity.prototype, property.name)
        }
    }

    protected getEntities(entities: string | Class | Class[]): Class[] {
        if (typeof entities === "function") {
            const meta = reflect(entities)
            if (!meta.decorators.find((x: ClassOptionDecorator) => x.name === "ClassOption")) return []
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