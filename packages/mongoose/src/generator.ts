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
    const result:any = {}
    for (const prop of parent.properties) {
        if(prop.name === "id") continue
        result[prop.name] = getPropertyDefinition(parent, prop, store)
    }
    return result;
}

function getOption(meta: ClassReflection):NamedSchemaOption {
    const classOption: NamedSchemaOption = meta.decorators.filter((x: ClassOptionDecorator): x is ClassOptionDecorator => x.name === "ClassOption")
        .reduce((a, b) => Object.assign(a, b.option), {})
    return {... classOption, name: classOption.name ?? meta.name }
}

// --------------------------------------------------------------------- //
// ------------------------------ ANALYZER ----------------------------- //
// --------------------------------------------------------------------- //

class MongooseHelper {
    readonly models = new Map<Class, ModelStore>()
    readonly client: Mongoose
    constructor(mongoose?: Mongoose) {
        this.client = mongoose ?? new mong.Mongoose()
        this.model = this.model.bind(this)
        this.getModels = this.getModels.bind(this)
        this.connect = this.connect.bind(this)
        this.disconnect = this.disconnect.bind(this)
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
            if(option.hook)
                option.hook(schema)
            //@collection.preSave() hook
            const preSaves = meta.methods.filter(m => m.decorators.some((x:PreSaveDecorator) => x.name === "MongoosePreSave"))
            schema.pre("save", async function(){
                for (const preSave of preSaves) {
                    const method:Function = type.prototype[preSave.name].bind(this)
                    await method()
                }
            })
            const mongooseModel = this.client.model<T & Document>(name, schema)
            this.models.set(type, { name, collectionName: mongooseModel.collection.name, definition, option })
            return mongooseModel
        }
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
const { model, getModels, models } = globalHelper

export { getDefinition, MongooseHelper, model, getModels, models, globalHelper }
