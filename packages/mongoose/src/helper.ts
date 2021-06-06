import { authorize } from "@plumier/core"
import reflect, { Class, useCache } from "@plumier/reflect"

import { RefDecorator } from "./types"

function normalizeEntityNoCache(type: Class) {
    const meta = reflect(type)
    reflect.flush(type)
    for (const prop of meta.properties) {
        const ref = prop.decorators.find((x: RefDecorator) => x.name === "MongooseRef")
        if (ref && prop.typeClassification === "Array") {
            const decorators = [
                authorize.readonly(),
                authorize.writeonly()
            ]
            Reflect.decorate(decorators, type.prototype, prop.name, void 0)
        }
    }
    return { success: true }
}

const normalizeEntityCache = new Map<Class, any>()

export const normalizeEntity = useCache(normalizeEntityCache, normalizeEntityNoCache, x => x)