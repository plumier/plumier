import mongoose, { SchemaOptions, SchemaTypeOptions } from "mongoose"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

type Ref<T> = T & mongoose.Document
type GeneratorHook = (schema: mongoose.Schema) => void
type NamedSchemaOption = SchemaOptions & { hook?: GeneratorHook, name?: string }
type ModelFactory = <T>(type: new (...args: any) => T) => mongoose.Model<T & mongoose.Document>
interface ClassOptionDecorator { name: "ClassOption", option: NamedSchemaOption }
interface PropertyOptionDecorator { name: "PropertyOption", option?: SchemaTypeOptions<any> }
interface RefDecorator { name: "MongooseRef", inverseProperty?:  string}
interface PreSaveDecorator { name: "MongoosePreSave" }
interface ModelStore { name: string, collectionName: string, definition: any, option: NamedSchemaOption }
interface AnalysisResult { name: string, collection: string, option: string, definition: string }


const ReferenceTypeNotRegistered = "MONG1000: Type {0} required type {1} which is not registered as Mongoose model"
const CanNotValidateNonProperty = `MONG1002: @val.unique() only can be applied on property`

export {
    NamedSchemaOption, Ref,
    ModelFactory, PropertyOptionDecorator, RefDecorator,
    ClassOptionDecorator, ReferenceTypeNotRegistered, CanNotValidateNonProperty,
    GeneratorHook, ModelStore, AnalysisResult, PreSaveDecorator
}

