import { Class, isCustomClass } from "@plumier/core"
import mong, { Document, ConnectionOptions, Mongoose } from "mongoose"
import reflect, { ClassReflection, PropertyReflection } from "tinspector"

import {
    ClassOptionDecorator,
    GeneratorHook,
    ModelFactory,
    ModelStore,
    NamedSchemaOption,
    PropertyOptionDecorator,
    RefDecorator,
    ReferenceTypeNotRegistered,
} from "./types"



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
            const type = store.get(prop.type)
            if (!type) throw Error(ReferenceTypeNotRegistered.format(parent.name, prop.type.name))
            return { type: mong.Types.ObjectId, ref: type.name, ...option }
        }
        else
            return { ...getDefinition(prop.type, store), ...option }
    }
    return { type: prop.type, ...option }
}

function getDefinition(type: Class, store: Map<Class, ModelStore>) {
    const parent = reflect(type)
    return parent.properties.reduce((a, b) => {
        return Object.assign(a, { [b.name]: getPropertyDefinition(parent, b, store) })
    }, {} as any)
}

function getOption(meta: ClassReflection, opt?: string | GeneratorHook | NamedSchemaOption) {
    const factoryOption =
        typeof opt === "string" ? { name: opt } :
            typeof opt === "function" ? { hook: opt } :
                (opt ?? {})
    const classOption:NamedSchemaOption = meta.decorators.filter((x: ClassOptionDecorator): x is ClassOptionDecorator => x.name === "ClassOption")
        .reduce((a, b) => Object.assign(a, b.option), {})
    return { ...classOption, ...factoryOption }
}

// --------------------------------------------------------------------- //
// ------------------------------ ANALYZER ----------------------------- //
// --------------------------------------------------------------------- //

class MongooseHelper {
    readonly models = new Map<Class, ModelStore>()
    private readonly mongoose:Mongoose
    constructor(mongoose?:Mongoose){
        this.mongoose = mongoose ?? new mong.Mongoose()
        this.model = this.model.bind(this)
        this.getModels = this.getModels.bind(this)
        this.connect = this.connect.bind(this)
        this.disconnect = this.disconnect.bind(this)
    }
    model<T>(type: new (...args: any) => T, opt?: string | GeneratorHook | NamedSchemaOption):mong.Model<T & mong.Document, {}> {
        const storedModel = this.models.get(type)
        if (storedModel) {
            return this.mongoose.model(storedModel.name)
        }
        else {
            const meta = reflect(type)
            const option = getOption(meta, opt)
            const name = option.name ?? type.name
            const definition = getDefinition(type, this.models)
            const schema = new this.mongoose.Schema(definition, option)
            if(option.hook) option.hook(schema)
            const mongooseModel = this.mongoose.model<T & Document>(name, schema)
            this.models.set(type, { name, collectionName: mongooseModel.collection.name, definition, option })
            return mongooseModel
        }
    }
    getModels(){
        return Array.from(this.models.keys())
    }
    connect(uri:string, opt?:ConnectionOptions){
        return this.mongoose.connect(uri, opt)
    }
    disconnect(){
        return this.mongoose.disconnect()
    }
}

const globalHelper = new MongooseHelper(mong)
const  { model, getModels, models } = globalHelper

export { getDefinition, MongooseHelper, model, getModels, models, globalHelper }
