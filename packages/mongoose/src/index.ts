import {
    Class,
    DefaultFacility,
    findFilesRecursive,
    isCustomClass,
    PlumierApplication,
    val,
    CustomValidatorFunction,
} from "@plumier/core"
import Chalk from "chalk"
import Mongoose from "mongoose"
import { dirname, isAbsolute, join } from "path"
import { ClassReflection, decorateClass, mergeDecorator, PropertyReflection, reflect, Reflection } from "tinspector"
import { Result, VisitorInvocation } from "typedconverter"
import { safeToString } from "typedconverter/lib/converter"

/* ------------------------------------------------------------------------------- */
/* ------------------------------------ TYPES ------------------------------------ */
/* ------------------------------------------------------------------------------- */

export type Constructor<T> = new (...args: any[]) => T
export type SchemaRegistry = { [key: string]: Mongoose.Schema }
export interface MongooseFacilityOption {
    model?: string | Class | Class[]
    uri: string,
    schemaGenerator?: SchemaGenerator
}
export interface SubSchema {
    type: typeof Mongoose.Schema.Types.ObjectId,
    ref: string
}
export type SchemaGenerator = (definition: any, meta: ClassReflection) => Mongoose.Schema
interface AnalysisResult {
    type: "warning" | "error",
    message: string
}
interface DomainAnalysis {
    domain: ClassReflection
    analysis: AnalysisResult[]
}
interface MongooseCollectionDecorator {
    type: "MongooseCollectionDecorator",
    alias?: string
}

const GlobalMongooseSchema: SchemaRegistry = {}
const ArrayHasNoTypeInfo = `MONG1000: Array property {0}.{1} require @array(<Type>) decorator to be able to generated into mongoose schema`
const NoClassFound = `MONG1001: No class decorated with @collection() found`
const CanNotValidateNonProperty = `MONG1002: @val.unique() only can be applied on property`
const ModelNotDecoratedWithCollection = `MONG1003: {0} not decorated with @collection()`

/* ------------------------------------------------------------------------------- */
/* ------------------------------- SCHEMA GENERATOR ------------------------------ */
/* ------------------------------------------------------------------------------- */

function loadModels(opt: Class[]) {
    return opt.map(x => reflect(x))
}

function getType(prop: PropertyReflection, registry: SchemaRegistry): Function | Function[] | SubSchema | SubSchema[] {
    if (isCustomClass(prop.type)) {
        const schema = { type: Mongoose.Schema.Types.ObjectId, ref: "" }
        return Array.isArray(prop.type) ? [{ ...schema, ref: getName(prop.type[0]) }]
            : { ...schema, ref: getName(prop.type) }
    }
    else return prop.type
}

function generateModel(model: ClassReflection, registry: SchemaRegistry, generator?: SchemaGenerator) {
    const definition = model.properties
        .reduce((a, b) => {
            a[b.name] = getType(b, registry)
            return a
        }, {} as any)
    registry[getName(model)] = !!generator ? generator(definition, model) : new Mongoose.Schema(definition)
}

function generateSchema(opt: Class[], registry: SchemaRegistry, generator?: SchemaGenerator) {
    loadModels(opt).forEach(x => generateModel(x, registry, generator))
}

/* ------------------------------------------------------------------------------- */
/* --------------------------------- ANALYZER ------------------------------------ */
/* ------------------------------------------------------------------------------- */

function noArrayTypeInfoTest(domain: ClassReflection): AnalysisResult[] {
    return domain.properties
        .map(x => (x.type === Array) ?
            <AnalysisResult>{ message: ArrayHasNoTypeInfo.format(domain.name, x.name), type: "error" } : undefined)
        .filter((x): x is AnalysisResult => Boolean(x))
}

function analyze(domains: ClassReflection[]) {
    const tests = [noArrayTypeInfoTest]
    return domains.map(x => (<DomainAnalysis>{
        domain: x,
        analysis: tests.map(test => test(x)).flatten()
    }))
}

function printAnalysis(analysis: DomainAnalysis[]) {
    console.log()
    console.log(Chalk.bold("Model Analysis Report"))
    if (!analysis.map(x => x.domain).some(x =>
        x.decorators.some((y: MongooseCollectionDecorator) => y.type === "MongooseCollectionDecorator"))) {
        console.log(NoClassFound)
    }
    else {
        const namePad = Math.max(...analysis.map(x => x.domain.name.length))
        analysis.forEach((x, i) => {
            const num = (i + 1).toString().padStart(analysis.length.toString().length)
            const color = x.analysis.some(x => x.type === "error") ? Chalk.red : (x: string) => x
            console.log(color(`${num}. ${x.domain.name.padEnd(namePad)} -> ${getName(x.domain)}`))
            x.analysis.forEach(y => {
                console.log(Chalk.red(`  - ${y.type} ${y.message}`))
            })
        })
    }
}

/* ------------------------------------------------------------------------------- */
/* --------------------------------- HELPERS ------------------------------------- */
/* ------------------------------------------------------------------------------- */

async function isUnique(value: string, target: Class | undefined, field: string) {
    if (!target) throw new Error(CanNotValidateNonProperty)
    const Model = model(target)
    const condition: { [key: string]: object } = {}
    //case insensitive comparison
    condition[field] = { $regex: value, $options: "i" }
    const result = await Model.findOne(condition)
    if (!!result) return `${value} already exists`
}

/* ------------------------------------------------------------------------------- */
/* ------------------------------- MAIN FUNCTIONS -------------------------------- */
/* ------------------------------------------------------------------------------- */

declare module "typedconverter" {
    namespace val {
        function unique(): (target: any, name: string, index?: any) => void
    }
}
val.unique = () => val.custom(async (value, info) => {
    if(info.ctx.method.toLocaleLowerCase() === "post")
        return isUnique(value, info.parent && info.parent.type, info.name)
})

export function reflectPath(path: string | Class | Class[]): Reflection[] {
    if (Array.isArray(path))
        return path.map(x => reflect(x))
    else if (typeof path === "string")
        return findFilesRecursive(path)
            .map(x => reflect(x))
            .map(x => x.members)
            .flatten()
    else
        return [reflect(path)]
}

export function collection(alias?: string) {
    return mergeDecorator(decorateClass(<MongooseCollectionDecorator>{ type: "MongooseCollectionDecorator", alias }),
        reflect.parameterProperties());
}

export function getName(opt: ClassReflection | Class) {
    const meta = typeof opt === "function" ? reflect(opt) : opt
    const decorator = meta.decorators.find((x: MongooseCollectionDecorator): x is MongooseCollectionDecorator => x.type === "MongooseCollectionDecorator")
    return decorator && decorator.alias || meta.name
}

function relationToObjectIdVisitor(i: VisitorInvocation): Result {
    const id = safeToString(i.value)
    if (Mongoose.Types.ObjectId.isValid(id) && isCustomClass(i.type))
        return Result.create(Mongoose.Types.ObjectId(id))
    else
        return i.proceed()
}

export class MongooseFacility extends DefaultFacility {
    option: MongooseFacilityOption
    constructor(opts: MongooseFacilityOption) {
        super()
        const model = opts.model || "./model"
        const domain = typeof model === "string" ? isAbsolute(model) ?
            model! : join(dirname(module.parent!.filename), model) : model
        this.option = { ...opts, model: domain }
    }

    async initialize(app: Readonly<PlumierApplication>) {
        //generate schemas
        const collections = reflectPath(this.option.model!)
            .filter((x): x is ClassReflection => x.kind === "Class")
            .filter(x => x.decorators.some((x: MongooseCollectionDecorator) => x.type == "MongooseCollectionDecorator"))
        if (app.config.mode === "debug") {
            const analysis = analyze(collections)
            printAnalysis(analysis)
        }
        generateSchema(collections.map(x => x.type), GlobalMongooseSchema, this.option.schemaGenerator)
        //register custom converter
        app.set({ typeConverterVisitors: [relationToObjectIdVisitor] })
        Mongoose.set("useUnifiedTopology", true)
        await Mongoose.connect(this.option.uri, { useNewUrlParser: true  })
    }
}

export function model<T>(type: Constructor<T>) {

    function traversePropertyType(meta: ClassReflection): Class[] {
        const properties = meta.properties
            .filter(x => isCustomClass(x.type))
            .map((x) => <Class>(Array.isArray(x.type) ? x.type[0] : x.type))
        return properties.length > 0 ?
            properties.concat(properties.map(x => reflect(x))
                .map(x => traversePropertyType(x))
                .flatten()) : []
    }

    class ModelProxyHandler<T> implements ProxyHandler<Mongoose.Model<T & Mongoose.Document>> {
        private isLoaded = false
        modelName: string;
        metaData: ClassReflection

        constructor(domain: Constructor<T>) {
            const meta = reflect(domain)
            this.modelName = getName(meta)
            this.metaData = meta
        }

        private getModelByName(name: string): Mongoose.Model<T & Mongoose.Document> {
            if (!Mongoose.connection.models[name])
                return Mongoose.model(name, GlobalMongooseSchema[name])
            else
                return Mongoose.model(name)
        }

        private getModel(): Mongoose.Model<T & Mongoose.Document> {
            if (!this.isLoaded) {
                const properties = traversePropertyType(this.metaData)
                const unique = Array.from(new Set(properties))
                unique.forEach(x => this.getModelByName(getName(x)))
                this.isLoaded = true
            }
            return this.getModelByName(this.modelName)
        }

        get(target: Mongoose.Model<T & Mongoose.Document>, p: PropertyKey, receiver: any): any {
            if (GlobalMongooseSchema[this.modelName]) {
                const Model = this.getModel();
                return (Model as any)[p]
            }
            else {
                return p === "toString" ? () => "[Function]" : (target as any)[p]
            }
        }

        construct?(target: Mongoose.Model<T & Mongoose.Document>, argArray: any, newTarget?: any): object {
            try {
                const Model = this.getModel();
                return new Model(...argArray)
            } catch (e) {
                throw new Error(ModelNotDecoratedWithCollection.format(this.modelName))
            }
        }
    }
    return new Proxy(Mongoose.Model as Mongoose.Model<T & Mongoose.Document>, new ModelProxyHandler<T>(type))
}
