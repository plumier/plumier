import {
    DefaultFacility,
    filterConverters,
    PlumierApplication,
    RelationDecorator,
} from "@plumier/core"
import { RequestHookMiddleware } from "@plumier/generic-controller"
import { Result, ResultMessages, VisitorInvocation } from "@plumier/validator"
import Mongoose from "mongoose"
import pluralize from "pluralize"

import { getModels, model as globalModel, MongooseHelper, proxy as globalProxy } from "./generator"
import { MongooseControllerGeneric, MongooseOneToManyControllerGeneric } from "./generic-controller"


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

function relationConverter(i: VisitorInvocation): Result {
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
        const uri = this.option.uri ?? process.env.PLUM_MONGODB_URI
        const helper = this.option.helper ?? {
            connect:(uri, option) =>  Mongoose.connect(uri, option), 
            getModels, model: globalModel,
            proxy: globalProxy,
            disconnect: Mongoose.disconnect,
        } as MongooseHelper
        app.set({ typeConverterVisitors: [...app.config.typeConverterVisitors, relationConverter, ...filterConverters] })
        app.set({
            responseTransformer: (p, v) => {
                return (p.name === "id" && v && v.constructor === Buffer) ? undefined : v
            }
        })
        if (uri) {
            await helper.connect(uri)
        }
    }
}