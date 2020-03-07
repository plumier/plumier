import { Class } from "@plumier/core"
import { SchemaTypeOpts } from "mongoose"
import reflect, { decorateProperty, mergeDecorator, decorateClass } from "tinspector"

import { PropertyOptionDecorator, RefDecorator, NamedSchemaOption, ClassOptionDecorator } from "./types"

// --------------------------------------------------------------------- //
// ----------------------------- DECORATORS ---------------------------- //
// --------------------------------------------------------------------- //

function document(option?: NamedSchemaOption): ClassDecorator {
    return mergeDecorator( 
        decorateClass(<ClassOptionDecorator>{ name: "ClassOption", option }), 
        reflect.parameterProperties()
    )
}

document.timestamp = (): ClassDecorator => {
    return document({ timestamps: true })
}

document.property = (option?: SchemaTypeOpts<any>) => {
    return decorateProperty(<PropertyOptionDecorator>{ name: "PropertyOption", option })
}

document.default = (value: {} | (() => {})) => {
    return document.property({ default: value })
}

document.ref = (type: Class | Class[]) => {
    return mergeDecorator(
        decorateProperty(<RefDecorator>{ name: "MongooseRef", type }),
        reflect.type(type)
    )
}

export { document  }