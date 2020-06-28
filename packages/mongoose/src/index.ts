import "./validator"

import { model } from "./generator"
export { model, MongooseHelper, getDefinition, getModels, models, globalHelper } from "./generator"
export { collection } from "./decorator"
export { MongooseFacility, MongooseGenericControllerFacility } from "./facility"
export { MongooseControllerGeneric, MongooseOneToManyControllerGeneric, MongooseRepository, MongooseOneToManyRepository } from "./generic-controller"
export * from "./types"
export default model;