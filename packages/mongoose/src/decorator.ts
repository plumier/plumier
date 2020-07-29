import { Class, relation } from "@plumier/core"
import { SchemaTypeOpts } from "mongoose"
import reflect, { decorateProperty, mergeDecorator, decorateClass, metadata } from "tinspector"

import { PropertyOptionDecorator, RefDecorator, NamedSchemaOption, ClassOptionDecorator } from "./types"

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

collection.ref = (type: Class | Class[] | ((x:any) => Class | Class[])) => {
    return mergeDecorator(
        decorateProperty(<RefDecorator>{ name: "MongooseRef" }),
        reflect.type(type),
        relation(x => {
            const pType = metadata.isCallback(type) ? type({}) : type
            return Array.isArray(pType) ? [String] : String
        })
    )
}

export { collection  }