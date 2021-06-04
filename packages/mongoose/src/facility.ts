import { Class, DefaultFacility, findClassRecursive, PlumierApplication, RelationDecorator } from "@plumier/core"
import { RequestHookMiddleware } from "@plumier/generic-controller"
import {
    FilterQueryAuthorizeMiddleware,
    OrderQueryAuthorizeMiddleware,
    SelectQueryAuthorizeMiddleware,
} from "@plumier/query-parser"
import reflect from "@plumier/reflect"
import { Result, ResultMessages, VisitorInvocation } from "@plumier/validator"
import Mongoose from "mongoose"
import { isAbsolute, join } from "path"
import pluralize from "pluralize"

import { getModels, model as globalModel, MongooseHelper, proxy as globalProxy } from "./generator"
import { MongooseControllerGeneric, MongooseNestedControllerGeneric } from "./generic-controller"
import { normalizeEntity } from "./helper"
import { filterConverter, orderConverter, selectConverter } from "./query-parser"
import { ClassOptionDecorator } from "./types"


interface MongooseFacilityOption { uri?: string, helper?: MongooseHelper, entity?: Class | Class[] | string | string[] }

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

async function loadEntities(entity: Class | Class[] | string | string[], opt: { rootDir: string }): Promise<Class[]> {
    if (Array.isArray(entity)) {
        const result: Class[] = []
        for (const e of entity) {
            result.push(... await loadEntities(e, opt))
        }
        return result;
    }
    if (typeof entity === "string") {
        const path = isAbsolute(entity) ? entity : join(opt.rootDir, entity)
        const types = await findClassRecursive(path)
        return loadEntities(types.map(x => x.type), opt)
    }
    const meta = reflect(entity)
    const isEntity = !!meta.decorators.find((x: ClassOptionDecorator) => x.name === "ClassOption")
    return isEntity ? [entity] : []
}

export class MongooseFacility extends DefaultFacility {
    option: MongooseFacilityOption
    constructor(opts?: MongooseFacilityOption) {
        super()
        this.option = {
            entity: [
                require.main!.filename,
                "./**/*controller.+(ts|js)",
                "./**/*entity.+(ts|js)"
            ], ...opts
        }
    }

    async preInitialize(app: Readonly<PlumierApplication>) {
        if (!this.option.entity) return
        const entities = await loadEntities(this.option.entity, app.config)
        for (const entity of entities) {
            normalizeEntity(entity)
        }
    }

    setup(app: Readonly<PlumierApplication>) {
        Object.assign(app.config, {
            genericController: [MongooseControllerGeneric, MongooseNestedControllerGeneric],
            genericControllerNameConversion: (x: string) => pluralize(x)
        })
        app.use(new RequestHookMiddleware(), "Action")
        app.use(new FilterQueryAuthorizeMiddleware(), "Action")
        app.use(new SelectQueryAuthorizeMiddleware(), "Action")
        app.use(new OrderQueryAuthorizeMiddleware(), "Action")
    }

    async initialize(app: Readonly<PlumierApplication>) {
        const uri = this.option.uri ?? process.env.PLUM_MONGODB_URI
        const helper = this.option.helper ?? {
            connect: (uri, option) => Mongoose.connect(uri, option),
            getModels, model: globalModel,
            proxy: globalProxy,
            disconnect: Mongoose.disconnect,
        } as MongooseHelper
        app.set({
            typeConverterVisitors: [
                ...app.config.typeConverterVisitors,
                relationConverter,
                filterConverter,
                selectConverter,
                orderConverter
            ]
        })
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