import { Class } from "@plumier/core"
import mongoose, { SchemaOptions, SchemaTypeOpts } from "mongoose"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //


type GeneratorHook = (schema: mongoose.Schema) => void
type NamedSchemaOption = SchemaOptions & { hook?: GeneratorHook, proxy?: boolean, name?: string }
interface MongooseFacilityOption { uri?: string }
type ModelFactory = <T>(type: new (...args: any) => T, opt?: string | GeneratorHook | NamedSchemaOption) => mongoose.Model<T & mongoose.Document, {}>
interface ClassOptionDecorator { name: "ClassOption", option: NamedSchemaOption }
interface PropertyOptionDecorator { name: "PropertyOption", option?: SchemaTypeOpts<any> }
interface RefDecorator { name: "MongooseRef" }
interface ModelStore { name: string, collectionName: string, definition: any, option: NamedSchemaOption }
interface AnalysisResult { name: string, collection: string, option: string, definition: string }
interface ModelGenerator {
    model: ModelFactory
    models: Map<Class, ModelStore>
}

const ReferenceTypeNotRegistered = "MONG1000: Type {0} required type {1} which is not registered as Mongoose model"
const CanNotValidateNonProperty = `MONG1002: @val.unique() only can be applied on property`

export {
    NamedSchemaOption,
    ModelFactory, PropertyOptionDecorator, RefDecorator,
    ModelGenerator, MongooseFacilityOption, ClassOptionDecorator,
    ReferenceTypeNotRegistered, CanNotValidateNonProperty,
    GeneratorHook, ModelStore, AnalysisResult
}

