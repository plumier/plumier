import { Class, isCustomClass } from "@plumier/core"
import mong, { ConnectionOptions, Document, Mongoose } from "mongoose"
import reflect, { ClassReflection, PropertyReflection } from "tinspector"

import { ClassOptionDecorator, ModelStore, NamedSchemaOption, PropertyOptionDecorator, RefDecorator } from "./types"



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
    return parent.properties.reduce((a, b) => {
        return Object.assign(a, { [b.name]: getPropertyDefinition(parent, b, store) })
    }, {} as any)
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
    private readonly mongoose: Mongoose
    constructor(mongoose?: Mongoose) {
        this.mongoose = mongoose ?? new mong.Mongoose()
        this.model = this.model.bind(this)
        this.getModels = this.getModels.bind(this)
        this.connect = this.connect.bind(this)
        this.disconnect = this.disconnect.bind(this)
    }
    model<T>(type: new (...args: any) => T): mong.Model<T & mong.Document, {}> {
        const storedModel = this.models.get(type)
        if (storedModel) {
            return this.mongoose.model(storedModel.name)
        }
        else {
            const meta = reflect(type)
            const option = getOption(meta)
            const name = option.name!
            const definition = getDefinition(type, this.models)
            const schema = new this.mongoose.Schema(definition, option)
            const mongooseModel = this.mongoose.model<T & Document>(name, schema)
            this.models.set(type, { name, collectionName: mongooseModel.collection.name, definition, option })
            return mongooseModel
        }
    }
    getModels() {
        return Array.from(this.models.keys())
    }
    connect(uri: string, opt?: ConnectionOptions) {
        return this.mongoose.connect(uri, opt)
    }
    disconnect() {
        return this.mongoose.disconnect()
    }
}

const globalHelper = new MongooseHelper(mong)
const { model, getModels, models } = globalHelper

export { getDefinition, MongooseHelper, model, getModels, models, globalHelper }
