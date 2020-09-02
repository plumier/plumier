import { Class, relation } from "@plumier/core"
import { SchemaTypeOpts } from "mongoose"
import reflect, { decorateClass, decorateProperty, mergeDecorator, decorateMethod } from "tinspector"

import { ClassOptionDecorator, NamedSchemaOption, PropertyOptionDecorator, RefDecorator, PreSaveDecorator } from "./types"

// --------------------------------------------------------------------- //
// ----------------------------- DECORATORS ---------------------------- //
// --------------------------------------------------------------------- //

function collection(option?: NamedSchemaOption): ClassDecorator {
    return mergeDecorator(
        decorateClass(<ClassOptionDecorator>{ name: "ClassOption", option }),
        reflect.parameterProperties()
    )
}

collection.property = (option?: SchemaTypeOpts<any>) => {
    return decorateProperty(<PropertyOptionDecorator>{ name: "PropertyOption", option })
}

collection.ref = (type: Class | Class[] | ((x: any) => Class | Class[])) => {
    return mergeDecorator(
        decorateProperty(<RefDecorator>{ name: "MongooseRef" }),
        reflect.type(type),
        relation()
    )
}

collection.preSave = () => {
    return decorateMethod(<PreSaveDecorator>{ name: "MongoosePreSave" })
}

export { collection }