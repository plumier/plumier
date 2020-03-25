import mongoose, { SchemaOptions, SchemaTypeOpts } from "mongoose"
import { Class } from '@plumier/core'

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

type Dockify<T> = {
    [K in keyof T]: T[K] extends Date ? Date :
    T[K] extends any[] ? DockifyArray<T[K]> :
    T[K] extends object ? Dockify<T[K]> : T[K]
} & mongoose.Document
type DockifyArray<T> = T extends Date[] ? Date[] :
    T extends object[] ? Dockify<T[number]>[] : T
type GeneratorHook = (schema: mongoose.Schema) => void
type NamedSchemaOption = SchemaOptions & { hook?: GeneratorHook, proxy?: boolean, name?: string }
type MongooseFacilityOption = { uri?: string }
type ModelFactory = <T>(type: new (...args: any) => T, opt?: string | GeneratorHook | NamedSchemaOption) => mongoose.Model<Dockify<T>, {}>
interface ClassOptionDecorator { name: "ClassOption", option: NamedSchemaOption }
interface PropertyOptionDecorator { name: "PropertyOption", option?: SchemaTypeOpts<any> }
interface RefDecorator { name: "MongooseRef" }
interface ModelStore { name: string, collectionName: string, definition: any, option: NamedSchemaOption }
interface AnalysisResult { name: string, collection: string, option: string, definition: string }
interface ModelGenerator {
    model: ModelFactory
    getAnalysis: () => AnalysisResult[]
}

const ReferenceTypeNotRegistered = "MONG1000: Type {0} required type {1} which is not registered as Mongoose model"
const CanNotValidateNonProperty = `MONG1002: @val.unique() only can be applied on property`

export {
    NamedSchemaOption,
    ModelFactory, PropertyOptionDecorator, RefDecorator,
    ModelGenerator, MongooseFacilityOption, ClassOptionDecorator,
    ReferenceTypeNotRegistered, CanNotValidateNonProperty,
    GeneratorHook, ModelStore, AnalysisResult, Dockify , DockifyArray 
}

