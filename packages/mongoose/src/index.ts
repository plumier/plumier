import { reflect, ClassReflection, ParameterReflection } from "@plumjs/reflect"
import { Class, Facility, Application, errorMessage, isCustomClass, b, DomainDecorator, reflectPath } from "@plumjs/core"
import Mongoose, { Model } from "mongoose"
import { dirname, isAbsolute, join } from 'path';
import Debug from "debug"

const log = Debug("plum:mongo")

export type Constructor<T> = new (...args: any[]) => T
export type SchemaRegistry = { [key: string]: Mongoose.Schema }
export interface MongooseFacilityOption {
    domainModel?: string | Class | Class[],
    uri: string,
}
export interface SubSchema {
    type: typeof Mongoose.Schema.Types.ObjectId,
    ref: string
}

const GlobalMongooseSchema: SchemaRegistry = {}

export class MongooseFacility implements Facility {
    option: MongooseFacilityOption
    constructor(private opts: MongooseFacilityOption) {
        this.option = { domainModel: "./model", ...opts }
        const model = typeof this.option.domainModel === "string" ?
            isAbsolute(this.option.domainModel) ? this.option.domainModel! : join(dirname(module.parent!.filename), this.option.domainModel)
            : this.option.domainModel!
        log(`[Constructor] model ${b(model)}`)
        generateSchema(model, GlobalMongooseSchema)
    }

    async setup(app: Application) {
        await Mongoose.connect(this.option.uri, { useNewUrlParser: true })
    }
}

function loadModels(opt: string | Class | Class[]) {
    if (Array.isArray(opt))
        return opt.map(x => reflect(x))
    return ((typeof opt === "string") ? reflectPath(opt) : [reflect(opt)])
        .filter((x): x is ClassReflection => x.type == "Class" && x.decorators.some((y: DomainDecorator) => y.name === "Domain"))
}

function getType(prop: ParameterReflection, registry: SchemaRegistry): Function | Function[] | SubSchema | SubSchema[] {
    log(`[GetType] Custom class ${b(prop.typeAnnotation)}`)
    if (isCustomClass(prop.typeAnnotation)) {
        const schema = { type: Mongoose.Schema.Types.ObjectId, ref: "" }
        return Array.isArray(prop.typeAnnotation) ? [{ ...schema, ref: prop.typeAnnotation[0].name }]
            : { ...schema, ref: prop.typeAnnotation.name }
    }
    else return prop.typeAnnotation
}

function generateModel(model: ClassReflection, registry: SchemaRegistry) {
    const schema = model.ctorParameters
        .reduce((a, b) => {
            a[b.name] = getType(b, registry)
            return a
        }, {} as any)
    log(`[GenerateModel] Creating schema for ${b(model.name)} Schema ${b(schema)}`)
    registry[model.name] = new Mongoose.Schema(schema)
}

function generateSchema(opt: string | Class | Class[], registry: SchemaRegistry) {
    const models = loadModels(opt)
    log(`[GenerateSchema] Loaded models ${b(models)}`)
    if (models.length == 0) {
        const message = typeof opt === "string" ? errorMessage.ModelPathNotFound.format(opt) : errorMessage.ModelNotFound
        throw new Error(message)
    }
    models.map(x => generateModel(x, registry))
}

function getModel<T>(type: Constructor<T>) {
    return Mongoose.model<T & Mongoose.Document>(type.name, GlobalMongooseSchema[type.name])
}


export function model<T extends object>(type: Constructor<T>) {
    class ModelMock { }
    return new Proxy(Mongoose.Model as Mongoose.Model<T & Mongoose.Document>, new ModelProxyHandler<T>(type))
}


class ModelProxyHandler<T extends object> implements ProxyHandler<Mongoose.Model<T & Mongoose.Document>> {
    model?: Mongoose.Model<T & Mongoose.Document>

    private getModel() {
        if (!this.model)
            this.model = getModel(this.domain)
        return this.model
    }

    constructor(private domain: Constructor<T>) { }

    get(target: Mongoose.Model<T & Mongoose.Document>, p: PropertyKey, receiver: any): any {
        if (GlobalMongooseSchema[this.domain.name]) {
            const Model = this.getModel();
            return (Model as any)[p]
        }
        else {
            return p === "toString" ? () => this.domain.toString() : (target as any)[p]
        }
    }

    construct?(target: Mongoose.Model<T & Mongoose.Document>, argArray: any, newTarget?: any): object {
        const Model = this.getModel();
        return new Model(...argArray)
    }
}