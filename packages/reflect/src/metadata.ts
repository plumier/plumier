import { Class, DecoratorId, DecoratorOption, DecoratorOptionId } from "./types"

interface MetadataRecord {
    targetClass: Class
    memberName?: string | symbol
    parIndex?: number
    data: any
}

const storage = new Map<Class, MetadataRecord[]>()

export function setMetadata(data: any, targetClass: Class, memberName?: string | symbol, parIndex?: number) {
    const getMetadataOption = (opt?: DecoratorOption): Required<DecoratorOption> => ({
        inherit: true, allowMultiple: true, applyTo: [], removeApplied: true, ...opt
    })
    const opt = data[DecoratorOptionId] = getMetadataOption(data[DecoratorOptionId])
    if (!opt.allowMultiple && !data[DecoratorId]) {
        throw new Error(`Reflect Error: Decorator with allowMultiple set to false must have DecoratorId property in ${targetClass.name}`)
    }
    const applyTo = typeof opt.applyTo === "string" ? [opt.applyTo] : opt.applyTo
    const meta = storage.get(targetClass) ?? []
    if (applyTo.length === 0)
        meta.push({ targetClass, memberName, parIndex, data })
    else {
        for (const apply of applyTo) {
            meta.push({ targetClass, memberName: apply, data })
        }
        meta.push({ targetClass, memberName, parIndex, data })
    }
    storage.set(targetClass, meta)
}

function getMetadataFromStorage(target: Class, memberName?: string, parIndex?: number) {
    return (storage.get(target) ?? [])
        .filter(x => x.memberName === memberName && x.parIndex === parIndex)
        .filter(x => {
            const opt: DecoratorOption = x.data[DecoratorOptionId]
            return opt.applyTo!.length === 0
        })
        .map(x => x.data)
}

export function mergeMetadata(childMeta: any[], parentMeta: any[], useInherit = true) {
    const result = [...childMeta]
    for (const parent of parentMeta) {
        const copyExists = () => !!childMeta.find(x => x[DecoratorId] !== undefined && x[DecoratorId] === parent[DecoratorId])
        const option = parent[DecoratorOptionId]
        if (useInherit && !option.inherit) continue
        if (!option.allowMultiple && copyExists()) continue
        result.push(parent)
    }
    return result
}

export function getMetadata(targetClass: Class, memberName?: string, parIndex?: number): any[] {
    const parent: Class = Object.getPrototypeOf(targetClass)
    const parentMeta: any[] = !!parent.prototype ? getMetadata(parent, memberName, parIndex) : []
    const childMeta = getMetadataFromStorage(targetClass, memberName, parIndex)
    return mergeMetadata(childMeta, parentMeta)
}

export function getMetadataForApplyTo(targetClass: Class, memberName?: string, parIndex?:number) {
    return (storage.get(targetClass) ?? [])
        .filter(x => x.memberName === memberName && x.parIndex === parIndex)
        .filter(x => {
            const opt: DecoratorOption = x.data[DecoratorOptionId]
            return opt.applyTo!.length > 0
        })
        .map(x => x.data)
}

export function getOwnMetadata(targetClass: Class, memberName?: string, parIndex?: number) {
    return getMetadataFromStorage(targetClass, memberName, parIndex)
}

export function getAllMetadata(targetClass: Class) {
    return storage.get(targetClass)
}