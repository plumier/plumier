import { val } from "typedconverter"
import { Class } from '@plumier/core'
import { CustomPropertyDecorator } from '@plumier/tinspector'
import { getManager } from 'typeorm'

async function isUnique(value: string, target: Class, field: string, method: string) {
    //case insensitive comparison
    const result = await getManager().getRepository(target)
        .createQueryBuilder()
        .where(`LOWER(${field}) = LOWER(:value)`, { value })
        .getMany()
    if (method === "post" && result && result.length > 0) return `${value} already exists`
    if ((method == "put" || method === "patch") && result && result.length > 1) return `${value} already exists`
}

declare module "typedconverter" {
    namespace val {
        function unique(): CustomPropertyDecorator
    }
}

val.unique = () => val.custom(async (value, info) => {
    return isUnique(value, (info.parent && info.parent.type)!, info.name, info.ctx.method.toLocaleLowerCase())
})