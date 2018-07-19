import { reflect, ClassReflection, ParameterReflection } from "@plumjs/reflect"
import { Class, Facility, Application, errorMessage, isCustomClass } from "@plumjs/core"
import Mongoose, { Schema } from "mongoose"
import { dirname, isAbsolute, join } from 'path';

export type Constructor<T> = new (...args: any[]) => T
export type SchemaRegistry = { [key: string]: Schema }
export interface MongooseFacilityOption {
    model?: string | Class | Class[],
    uri: string,
    registry?: SchemaRegistry
}

const GlobalMongooseSchema: SchemaRegistry = {}

export class MongooseFacility implements Facility {
    option: MongooseFacilityOption
    constructor(private opts: MongooseFacilityOption) {
        this.option = { model: "./model", ...opts }
        if (typeof this.option.model === "string") {
            const executionPath = dirname(module.parent!.filename)
            generateSchema(isAbsolute(this.option.model) ? this.option.model :
                join(executionPath, this.option.model), this.option.registry || GlobalMongooseSchema)
        }
    }

    async setup(app: Application) {
        await Mongoose.connect(this.option.uri)
    }
}

function loadModels(opt: string | Class | Class[]) {
    if (Array.isArray(opt))
        return opt.map(x => reflect(x))
    return ((typeof opt === "string") ? reflect(opt).members : [reflect(opt)])
        .filter((x): x is ClassReflection => x.type == "Class" && x.decorators.some(x => x.type === "ModelDecorator"))
}

function getType(prop: ParameterReflection, registry: SchemaRegistry): Function | Schema {
    return isCustomClass(prop.typeAnnotation) ? Array.isArray(prop.typeAnnotation)
        ? [registry[prop.name]] : registry[prop.name] : prop.typeAnnotation
}

function generateModel(model: ClassReflection, registry: SchemaRegistry) {
    const schema = model.ctorParameters
        .reduce((a, b) => a[b.name] = getType(b, registry), {} as any)
    registry[model.name] = new Schema(schema)
}


function generateSchema(opt: string | Class | Class[], registry: SchemaRegistry) {
    const models = loadModels(opt)
    if (models.length == 0) {
        const message = typeof opt === "string" ? errorMessage.ModelPathNotFound.format(opt) : errorMessage.ModelNotFound
        throw new Error(message)
    }
    models.map(x => generateModel(x, registry))
}

export function mongoose<T>(type: Constructor<T>, registry?: SchemaRegistry) {
    return Mongoose.model<T & Mongoose.Document>(type.name, (registry || GlobalMongooseSchema)[type.name])
}
