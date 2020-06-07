import "./validator"

import { model } from "./generator"
export { getAnalysis, model, generator, getDefinition, models } from "./generator"
export { collection } from "./decorator"
export { MongooseFacility, CRUDMongooseFacility } from "./facility"
export { printAnalysis, createAnalyzer } from "./analyzer"
export { MongooseControllerGeneric, MongooseOneToManyControllerGeneric, MongooseRepository, MongooseOneToManyRepository } from "./generic-controller"
export * from "./types"
export default model;