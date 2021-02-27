import { Result, VisitorInvocation } from "@plumier/validator";
import { FilterDecorator } from "./decorator";
import { parseFilter } from "./parser";


function stringFilterVisitor(i: VisitorInvocation, ctx:any) {
    if(i.value === undefined || i.value === null) return i.proceed()
    const decorator = i.decorators.find((x: FilterDecorator) => x.kind === "plumier-meta:filter-decorator")
    if (!!decorator) {
        try {
            const rawValue = Array.isArray(i.value) ? i.value : [i.value]
            if(rawValue.some(x => typeof x !== "string"))
                return Result.error(i.value, i.path, "Non string value is not allowed")
            const value = (rawValue as string[]).map(x => x.startsWith("(") ? x : `(${x})`).join(" AND ")
            const result = parseFilter(value)
            return Result.create(result)
        }
        catch (e) {
            return Result.error(i.value, i.path, e.message)
        }
    }
    return i.proceed()
}

export { stringFilterVisitor }