import { reflect, ClassReflection, ParameterReflection } from "@plumjs/reflect"
import { Class, Facility, Application, errorMessage, isCustomClass } from "@plumjs/core"
import Mongoose, { Schema } from "mongoose"

export class MongooseFacility implements Facility {
    constructor(opt: { model: string | Class | Class[], uri: string }) { 
        
    }

    async setup(app: Application) {

    }
}

function loadModels(opt: string | Class | Class[]) {
    if (Array.isArray(opt))
        return opt.map(x => reflect(x))
    return ((typeof opt === "string") ? reflect(opt).members : [reflect(opt)])
        .filter((x): x is ClassReflection => x.type == "Class" && x.decorators.some(x => x.type === "ModelDecorator"))
}

function getType(prop:ParameterReflection): Function | string {
    return isCustomClass(prop.typeAnnotation) ? prop.name : prop.typeAnnotation
}

function generateModel(model:ClassReflection, registry: { [key: string]: Schema }):Schema {
    const schema =  model.ctorParameters
        .reduce((a, b) => a[b.name] = getType(b) , {} as any)
    registry[model.name] = schema
    return new Schema(schema)
}


function generate(opt: string | Class | Class[], registry: { [key: string]: Schema }) {
    const models = loadModels(opt)
    if (models.length == 0) throw new Error(errorMessage.ModelNotFound)
    return models.map(x => generateModel(x, registry))
}
