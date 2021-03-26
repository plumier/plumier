import "./validator"

import { model } from "./generator"
export { model, proxy, MongooseHelper, getDefinition, getModels, models } from "./generator"
export { collection } from "./decorator"
export { MongooseFacility } from "./facility"
export { MongooseControllerGeneric, MongooseOneToManyControllerGeneric, GenericController, createGenericControllerMongoose } from "./generic-controller"
export {  MongooseRepository, MongooseOneToManyRepository } from "./repository"
export * from "./types"
export * from "./converters"
export default model;