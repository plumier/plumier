import { Class, crud, api } from "@plumier/core"
import { SchemaTypeOpts } from "mongoose"
import reflect, { decorateProperty, mergeDecorator, decorateClass } from "tinspector"

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
        crud.oneToMany(type),
        api.params.readOnly()
    )
}

export { collection  }