import { api, DefaultFacility, GenericControllerDecorator, PlumierApplication, RelationDecorator, RequestHookMiddleware } from "@plumier/core"
import Mongoose from "mongoose"
import reflect from "tinspector"
import { Result, ResultMessages, VisitorInvocation } from "typedconverter"

import { getModels, MongooseHelper } from "./generator"
import { RefDecorator } from "./types"
import { MongooseControllerGeneric, MongooseOneToManyControllerGeneric } from './generic-controller'
import pluralize from 'pluralize'

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

    setup(app: Readonly<PlumierApplication>) {
        Object.assign(app.config, {
            genericController: [MongooseControllerGeneric, MongooseOneToManyControllerGeneric],
            genericControllerNameConversion: (x: string) => pluralize(x)
        })
        app.use(new RequestHookMiddleware(), "Action")
    }

    async initialize(app: Readonly<PlumierApplication>) {
        app.set({ typeConverterVisitors: [validateRelation] })
        const uri = this.option.uri ?? process.env.PLUM_MONGODB_URI
        const helper = this.option.helper ?? { connect: Mongoose.connect, getModels }
        if (uri) {
            await helper.connect(uri)
        }
        const entities = helper.getModels()
        // update decorators for Open API schema
        for (const entity of entities) {
            const meta = reflect(entity)
            const isGeneric = meta.decorators.find((x: GenericControllerDecorator) => x.name === "plumier-meta:controller")
            for (const property of meta.properties) {
                if (["id", "createdAt", "updatedAt"].some(x => property.name === x)) {
                    Reflect.decorate([api.readonly()], entity.prototype, property.name)
                }
                if (isGeneric && property.decorators.find((x: RefDecorator) => x.name === "MongooseRef")) {
                    if (property.typeClassification === "Array")
                        Reflect.decorate([api.readonly(), api.writeonly()], entity.prototype, property.name)
                }
            }
            reflect.flush(entity)
        }
    }
}