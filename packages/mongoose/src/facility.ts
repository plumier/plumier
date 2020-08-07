import {
    api,
    Class,
    DefaultFacility,
    findClassRecursive,
    PlumierApplication,
    relation,
    RelationDecorator,
} from "@plumier/core"
import { GenericControllerFacility, GenericControllerFacilityOption } from "@plumier/generic-controller"
import Mongoose from "mongoose"
import reflect, { PropertyReflection } from "tinspector"
import convert, { Result, ResultMessages, VisitorInvocation } from "typedconverter"

import { getModels, MongooseHelper } from "./generator"
import { MongooseControllerGeneric, MongooseOneToManyControllerGeneric } from "./generic-controller"
import { ClassOptionDecorator, RefDecorator } from "./types"

interface MongooseFacilityOption { uri?: string, helper?: MongooseHelper }

function convertValue(value: any, path: string): Result {
    if (Array.isArray(value)) {
        const result: ResultMessages[] = []
        for (const [i, item] of value.entries()) {
            const converted = convertValue(item, `${path}[${i}]`)
            if (converted.issues)
                result.push(...converted.issues)
        }
        return { value, issues: result.length > 0 ? result : undefined }
    }
    else {
        if (!Mongoose.isValidObjectId(value))
            return Result.error(value, path, "Invalid MongoDB id")
        else
            return Result.create(value)
    }
}

function validateRelation(i: VisitorInvocation): Result {
    if (i.value && i.decorators.find((x: RelationDecorator) => x.kind === "plumier-meta:relation"))
        return convertValue(i.value, i.path)
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
        app.set({ typeConverterVisitors: [validateRelation] })
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
            Reflect.decorate([api.readonly()], entity.prototype, property.name)
        }
        if (property.decorators.find((x: RefDecorator) => x.name === "MongooseRef")) {
            if (property.typeClassification === "Array")
                Reflect.decorate([relation(), api.readonly(), api.writeonly()], entity.prototype, property.name)
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