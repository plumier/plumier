import "./validator"

import { model } from "./generator"
export { model, proxy, MongooseHelper, getDefinition, getModels, models, globalHelper } from "./generator"
export { collection } from "./decorator"
export { MongooseFacility } from "./facility"
export { MongooseControllerGeneric, MongooseOneToManyControllerGeneric, MongooseRepository, MongooseOneToManyRepository } from "./generic-controller"
export * from "./types"
export default model;