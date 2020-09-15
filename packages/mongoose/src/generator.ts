import { Class, isCustomClass } from "@plumier/core"
import mong, { ConnectionOptions, Document, Mongoose } from "mongoose"
import reflect, { ClassReflection, PropertyReflection } from "tinspector"

import { ClassOptionDecorator, ModelStore, NamedSchemaOption, PropertyOptionDecorator, RefDecorator, PreSaveDecorator } from "./types"



// --------------------------------------------------------------------- //
// ----------------------------- GENERATOR ----------------------------- //
// --------------------------------------------------------------------- //


function getPropertyDefinition(parent: ClassReflection, prop: PropertyReflection, store: Map<Class, ModelStore>): {} | {}[] {
    const option = prop.decorators.filter((x: PropertyOptionDecorator): x is PropertyOptionDecorator => x.name === "PropertyOption")
        .reduce((a, b) => ({ ...a, ...b.option }), {})
    if (Array.isArray(prop.type)) {
        const type = prop.type[0]
        return [getPropertyDefinition(parent, { ...prop, type }, store)]
    }
    if (isCustomClass(prop.type)) {
        const ref = prop.decorators.find((x: RefDecorator): x is RefDecorator => x.name === "MongooseRef")
        if (ref) {
            const meta = reflect(prop.type as Class)
            const option = getOption(meta)
            return { type: mong.Types.ObjectId, ref: option.name, ...option }
        }
        else
            return { ...getDefinition(prop.type, store), ...option }
    }
    return { type: prop.type, ...option }
}

function getDefinition(type: Class, store: Map<Class, ModelStore>) {
    const parent = reflect(type)
    const result: any = {}
    for (const prop of parent.properties) {
        if (prop.name === "id") continue
        result[prop.name] = getPropertyDefinition(parent, prop, store)
    }
    return result;
}

function getOption(meta: ClassReflection): NamedSchemaOption {
    const classOption: NamedSchemaOption = meta.decorators.filter((x: ClassOptionDecorator): x is ClassOptionDecorator => x.name === "ClassOption")
        .reduce((a, b) => Object.assign(a, b.option), {})
    return { ...classOption, name: classOption.name ?? meta.name }
}

// --------------------------------------------------------------------- //
// --------------------------- PROXY HANDLER --------------------------- //
// --------------------------------------------------------------------- //

/*
USE CASE REQUIRE PROXY

@collection()
export class Child {
    @noop()
    name:string 

    @collection.ref(x => Parent)
    children:Ref<Parent>
}

// below will throw error, because "model" unable to get the Parent datatype 
// even its defined with callback or Ref<Parent> but still need to resolve immediately 
// before the Parent available
export const ChildModel = model(Child)

@collection()
export class Parent {
    @noop()
    name:string 

    @collection.ref(x => [Child])
    children:Child[]
}

export const ParentModel = model(Parent)
*/

class ModelProxyHandler<T> implements ProxyHandler<mong.Model<T & mong.Document>>{
    constructor(private type: Class, private helper: MongooseHelper) { }

    resolveModel(): mong.Model<T & mong.Document> {
        return this.helper.model(this.type)
    }

    get(target: mong.Model<T & mong.Document>, p: PropertyKey, receiver: any): any {
        const Model = this.resolveModel()
        return (Model as any)[p]
    }

    construct?(target: mong.Model<T & mong.Document>, argArray: any, newTarget?: any): object {
        const Model = this.resolveModel()
        return new Model(...argArray)
    }
}


class MongooseHelper {
    readonly models = new Map<Class, ModelStore>()
    readonly client: Mongoose
    constructor(mongoose?: Mongoose) {
        this.client = mongoose ?? new mong.Mongoose()
        this.model = this.model.bind(this)
        this.proxy = this.proxy.bind(this)
        this.getModels = this.getModels.bind(this)
        this.connect = this.connect.bind(this)
        this.disconnect = this.disconnect.bind(this)
    }

    private preSave(meta: ClassReflection, schema: mong.Schema) {
        const preSaves = meta.methods.filter(m => m.decorators.some((x: PreSaveDecorator) => x.name === "MongoosePreSave"))
        schema.pre("save", async function () {
            for (const preSave of preSaves) {
                const method: Function = meta.type
                    .prototype[preSave.name]
                    // this --> function context to the document
                    .bind(this)
                await method()
            }
        })
    }

    model<T>(type: new (...args: any) => T): mong.Model<T & mong.Document, {}> {
        const storedModel = this.models.get(type)
        if (storedModel) {
            return this.client.model(storedModel.name)
        }
        else {
            const meta = reflect(type)
            const option = getOption(meta)
            const name = option.name!
            const definition = getDefinition(type, this.models)
            const schema = new this.client.Schema(definition, option)
            if (option.hook)
                option.hook(schema)
            //@collection.preSave() hook
            this.preSave(meta, schema)
            const mongooseModel = this.client.model<T & Document>(name, schema)
            this.models.set(type, { name, collectionName: mongooseModel.collection.name, definition, option })
            // register through all the ref properties
            for (const prop of meta.properties) {
                const isRef = !!prop.decorators.find((x: RefDecorator) => x.name === "MongooseRef")
                if (!isRef) continue
                const dataType: Class = Array.isArray(prop.type) ? prop.type[0] : prop.type
                // if already registered then continue
                if (this.models.get(dataType)) continue
                this.model(dataType)
            }
            return mongooseModel
        }
    }
    proxy<T>(type: new (...args: any) => T): mong.Model<T & mong.Document, {}> {
        return new Proxy(mong.Model as mong.Model<T & mong.Document>, new ModelProxyHandler<T>(type, this))
    }
    getModels() {
        return Array.from(this.models.keys())
    }
    connect(uri: string, opt?: ConnectionOptions) {
        return this.client.connect(uri, opt)
    }
    disconnect() {
        return this.client.disconnect()
    }
}

const globalHelper = new MongooseHelper(mong)
const { model, getModels, models, proxy } = globalHelper

export { getDefinition, MongooseHelper, model, proxy, getModels, models, globalHelper }
