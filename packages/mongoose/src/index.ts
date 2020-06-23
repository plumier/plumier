import "./validator"

import { model } from "./generator"
export { model, generator, getDefinition, models, getModels } from "./generator"
export { collection } from "./decorator"
export { MongooseFacility, MongooseGenericControllerFacility } from "./facility"
export { MongooseControllerGeneric, MongooseOneToManyControllerGeneric, MongooseRepository, MongooseOneToManyRepository } from "./generic-controller"
export * from "./types"
export default model;