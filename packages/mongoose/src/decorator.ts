import { api, Class, entity } from "@plumier/core"
import reflect, { decorateClass, decorateMethod, decorateProperty, mergeDecorator } from "@plumier/reflect"
import { SchemaTypeOptions } from "mongoose"

import { ClassOptionDecorator, NamedSchemaOption, PreSaveDecorator, PropertyOptionDecorator, RefDecorator } from "./types"

// --------------------------------------------------------------------- //
// ----------------------------- DECORATORS ---------------------------- //
// --------------------------------------------------------------------- //


function collection(option?: NamedSchemaOption): ClassDecorator {
    return mergeDecorator(
        decorateClass(<ClassOptionDecorator>{ name: "ClassOption", option }),
        reflect.parameterProperties()
    )
}

collection.property = (option?: Partial<SchemaTypeOptions<any>>) => {
    return decorateProperty(<PropertyOptionDecorator>{ name: "PropertyOption", option })
}

collection.ref = <T>(type: Class<T> | Class<T>[] | ((x: any) => Class<T> | Class<T>[]), inverseProperty?: keyof T) => {
    return mergeDecorator(
        decorateProperty(<RefDecorator>{ name: "MongooseRef", inverseProperty }),
        reflect.type(type),
        entity.relation({ inverseProperty: inverseProperty as string })
    )
}

collection.id = () => {
    return mergeDecorator(
        api.readonly(),
        entity.primaryId()
    )
}

collection.preSave = () => {
    return decorateMethod(<PreSaveDecorator>{ name: "MongoosePreSave" })
}

export { collection }