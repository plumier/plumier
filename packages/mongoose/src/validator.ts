
import { val } from "@plumier/validator"
import { model, MongooseHelper } from './generator'
import { Class } from '@plumier/core'
import { CanNotValidateNonProperty } from './types'

async function isUnique(value: string, target: Class | undefined, field: string, method: string, helper?: MongooseHelper) {
    if (!target) throw new Error(CanNotValidateNonProperty)
    const Model = helper?.model(target) ?? model(target)
    const condition: { [key: string]: object } = {}
    //case insensitive comparison
    condition[field] = { $regex: `^${value}$`, $options: "i" }
    const result = await Model.find(condition)
    if (method === "post" && result && result.length > 0) return `${value} already exists`
    if ((method == "put" || method === "patch") && result && result.length > 1) return `${value} already exists`
}

declare module "@plumier/validator" {
    namespace val {
        function unique(helper?:MongooseHelper): (target: any, name: string, index?: any) => void
    }
}

val.unique = (helper?:MongooseHelper) => val.custom(async (value, info) => {
    return isUnique(value, info.parent && info.parent.type, info.name, info.ctx.method.toLocaleLowerCase(), helper)
})