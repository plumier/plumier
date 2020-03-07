import { Class, isCustomClass, DefaultFacility, PlumierApplication } from "@plumier/core"
import mongoose, { SchemaTypeOpts } from "mongoose"
import reflect, { ClassReflection, decorateProperty, mergeDecorator, PropertyReflection } from "tinspector"

import {
    ModelFactory,
    ModelGenerator,
    NamedSchemaOption,
    PropertyOptionDecorator,
    RefDecorator,
    ReferenceTypeNotRegistered,
    MongooseFacilityOption,
    GeneratorHook,
    ClassOptionDecorator,
} from "./types"
import { createAnalyzer } from './analyzer'



// --------------------------------------------------------------------- //
// ----------------------------- GENERATOR ----------------------------- //
// --------------------------------------------------------------------- //
interface ModelStore { name: string, definition: any, option: NamedSchemaOption }


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
            return { type: mongoose.Types.ObjectId, ref: type.name, ...option }
        }
        else
            return { ...getDefinition(prop.type, store), ...option }
    }
    return { type: prop.type || Object, ...option }
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

function modelFactory(store: Map<Class, ModelStore>): ModelFactory {
    return <T>(type: new (...args: any) => T, opt?: string | GeneratorHook | NamedSchemaOption) => {
        const storedModel = store.get(type)
        if (storedModel) {
            return mongoose.model<T & mongoose.Document>(storedModel.name)
        }
        else {
            const meta = reflect(type)
            const option = getOption(meta, opt)
            const name = option.name ?? type.name
            const definition = getDefinition(type, store)
            store.set(type, { name, definition, option })
            const schema = new mongoose.Schema(definition, option)
            if(option.hook) option.hook(schema)
            return mongoose.model<T & mongoose.Document>(name, schema)
        }
    }
}

// --------------------------------------------------------------------- //
// ------------------------------ ANALYZER ----------------------------- //
// --------------------------------------------------------------------- //


function generator(): ModelGenerator {
    const models = new Map<Class, ModelStore>()
    return {
        model: modelFactory(models),
        printAnalysis: createAnalyzer(models)
    }
}

const { model, ...globalGenerator } = generator()

export class MongooseFacility extends DefaultFacility {
    option: MongooseFacilityOption
    constructor(opts?: MongooseFacilityOption) {
        super()
        this.option = { ...opts }
    }

    async initialize(app: Readonly<PlumierApplication>) {
        //default config 
    }
}

export { getDefinition, ModelStore, generator, model }


// --------------------------------------------------------------------- //
// -------------------------------- IMPL ------------------------------- //
// --------------------------------------------------------------------- //

// const { model, ...generator } = modelGenerator({
//     timestamps: true,
//     toJSON: { virtuals: false }
// })

// generator.printAnalysis()

// class Client {

//     @schema({ default: () => true })
//     @schema.default(20)
//     @schema.ref()
//     data: number = 20
// }
// const A = model(Client)
// const B = model(Client, "Client")
// const C = model(Client, { name: "Client", timestamps: true })