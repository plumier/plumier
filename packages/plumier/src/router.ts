import {
    b,
    Class,
    Configuration,
    errorMessage,
    IgnoreDecorator,
    isCustomClass,
    RootDecorator,
    RouteDecorator,
    RouteInfo,
} from "@plumjs/core";
import { ClassReflection, FunctionReflection, ParameterReflection, reflect, Reflection } from "@plumjs/reflect";
import chalk from "chalk";
import Debug from "debug";
import * as Fs from "fs";
import { Context } from "koa";
import * as Path from "path";
import Ptr from "path-to-regexp";
import { model } from 'mongoose';

const log = Debug("plum:router")

/* ------------------------------------------------------------------------------- */
/* ---------------------------------- TYPES -------------------------------------- */
/* ------------------------------------------------------------------------------- */

type AnalyzerFunction = (route: RouteInfo, allRoutes: RouteInfo[]) => Issue
interface Issue { type: "error" | "warning" | "success", message?: string }
interface TestResult { route: RouteInfo, issues: Issue[] }

/* ------------------------------------------------------------------------------- */
/* ------------------------------- HELPERS --------------------------------------- */
/* ------------------------------------------------------------------------------- */

export function striveController(name: string) {
    return name.substring(0, name.lastIndexOf("Controller")).toLowerCase()
}

export function getControllerRoute(controller: ClassReflection) {
    const root: RootDecorator = controller.decorators.find((x: RootDecorator) => x.name == "Root")
    return (root && root.url) || `/${striveController(controller.name)}`
}

function getActionName(route: RouteInfo) {
    return `${route.controller.name}.${route.action.name}(${route.action.parameters.map(x => x.name).join(", ")})`
}

function resolveDir(path: string, ext: string[]): string[] {
    //resolve provided path directory or file
    if (Fs.lstatSync(path).isDirectory()) {
        const files = Fs.readdirSync(path)
            //take only file in extension list
            .filter(x => ext.some(ex => Path.extname(x) === ex))
            //add root path + file name
            .map(x => Path.join(path, x))
        log(`[Router] Resolve files with ${ext.join("|")}`)
        log(`${files.join("\n")}`)
        return files
    }

    else
        return [path]
}

/* ------------------------------------------------------------------------------- */
/* ---------------------------------- TRANSFORMER -------------------------------- */
/* ------------------------------------------------------------------------------- */

function transformRouteDecorator(controller: ClassReflection, method: FunctionReflection): RouteInfo | undefined {
    if (method.decorators.some((x: IgnoreDecorator) => x.name == "Ignore")) return
    const root = getControllerRoute(controller)
    const decorator: RouteDecorator = method.decorators.find((x: RouteDecorator) => x.name == "Route")
    const result = <RouteInfo>{ action: method, method: decorator.method, controller: controller }
    //absolute route
    if (decorator.url && decorator.url.startsWith("/"))
        return { ...result, url: decorator.url }
    //empty string
    else if (decorator.url === "")
        return { ...result, url: root }
    //relative route
    else {
        const actionUrl = decorator.url || method.name.toLowerCase()
        return { ...result, url: [root, actionUrl].join("/") }
    }

}

function transformRegular(controller: ClassReflection, method: FunctionReflection): RouteInfo | undefined {
    return {
        method: "get",
        url: `${getControllerRoute(controller)}/${method.name.toLowerCase()}`,
        action: method,
        controller: controller,
    }
}

export function transformController(object: ClassReflection | Class) {
    const controller = typeof object === "function" ? reflect(object) : object
    if (!controller.name.toLowerCase().endsWith("controller")) return []
    return controller.methods.map(method => {
        //first priority is decorator
        if (method.decorators.some((x: IgnoreDecorator | RouteDecorator) => x.name == "Ignore" || x.name == "Route"))
            return transformRouteDecorator(controller, method)
        else
            return transformRegular(controller, method)
    })
        //ignore undefined
        .filter(x => Boolean(x)) as RouteInfo[]
}

export function transformModule(path: string, extensions: string[]): RouteInfo[] {
    //read all files and get module reflection
    const modules = resolveDir(path, extensions)
        //reflect the file
        .map(x => reflect(x))
    //get all module.members and combine into one array
    return modules.reduce((a, b) => a.concat(b.members), <Reflection[]>[])
        //take only the controller class
        .filter(x => x.type === "Class" && x.name.toLowerCase().endsWith("controller"))
        //traverse and change into route
        .map(x => transformController(<ClassReflection>x))
        //flatten the result
        .reduce((a, b) => a.concat(b), [])
}

/* ------------------------------------------------------------------------------- */
/* ------------------------------- ROUTER ---------------------------------------- */
/* ------------------------------------------------------------------------------- */

function checkUrlMatch(route: RouteInfo, ctx: Context) {
    const keys: Ptr.Key[] = []
    const regexp = Ptr(route.url, keys)
    const match = regexp.exec(ctx.path)
    log(`[Router] Route: ${b(route.method)} ${b(route.url)} Ctx Path: ${b(ctx.method)} ${b(ctx.path)} Match: ${b(match)}`)
    return { keys, match, method: route.method.toUpperCase(), route }
}

export function router(infos: RouteInfo[], config: Configuration, handler: (ctx: Context) => Promise<void>) {
    return async (ctx: Context, next: () => Promise<void>) => {
        const match = infos.map(x => checkUrlMatch(x, ctx))
            .find(x => Boolean(x.match) && x.method == ctx.method)
        if (match) {
            log(`[Router] Match route ${b(match.route.method)} ${b(match.route.url)} with ${b(ctx.method)} ${b(ctx.path)}`)
            //assign config and route to context
            Object.assign(ctx, { config, route: match.route })
            //add query
            const query = match.keys.reduce((a, b, i) => {
                a[b.name.toString().toLowerCase()] = match.match![i + 1]
                return a;
            }, <any>{})
            log(`[Router] Extracted parameter from url ${b(query)}`)
            Object.assign(ctx.query, query)
            await handler(ctx)
        }
        else {
            log(`[Router] Not route match ${b(ctx.method)} ${b(ctx.url)}`)
            await next()
        }
    }
}

/* ------------------------------------------------------------------------------- */
/* --------------------------- ANALYZER FUNCTION --------------------------------- */
/* ------------------------------------------------------------------------------- */

//------ Analyzer Helpers
function getModelsInParameters(par: ParameterReflection[]) {
    return par
        .map((x, i) => ({ type: x.typeAnnotation, index: i }))
        .filter(x => x.type && isCustomClass(x.type))
        .map(x => ({ meta: reflect((Array.isArray(x.type) ? x.type[0] : x.type) as Class), index: x.index }))
}

function traverseModel(par: ParameterReflection[]): ClassReflection[] {
    const models = getModelsInParameters(par).map(x => x.meta)
    const child = models.map(x => traverseModel(x.ctorParameters))
        .filter((x): x is ClassReflection[] => Boolean(x))
        .reduce((a, b) => a!.concat(b!), [] as ClassReflection[])
    return models.concat(child)
}

function traverseArray(parent: string, par: ParameterReflection[]): string[] {
    const models = getModelsInParameters(par)
    if (models.length > 0) {
        return models.map((x, i) => traverseArray(x.meta.name, x.meta.ctorParameters))
            .reduce((a, b) => a.concat(b), [])
    }
    return par.filter(x => x.typeAnnotation === Array)
        .map(x => `${parent}.${x.name}`)
}

//----- 

function backingParameterTest(route: RouteInfo, allRoutes: RouteInfo[]): Issue {
    const ids = route.url.split("/")
        .filter(x => x.startsWith(":"))
        .map(x => x.substring(1))
    const missing = ids.filter(id => route.action.parameters.map(x => x.name).indexOf(id) === -1)
    if (missing.length > 0) {
        return {
            type: "error",
            message: errorMessage.RouteDoesNotHaveBackingParam.format(missing.join(", "))
        }
    }
    else return { type: "success" }
}

function metadataTypeTest(route: RouteInfo, allRoutes: RouteInfo[]): Issue {
    const hasTypeInfo = route.action
        .parameters.some(x => Boolean(x.typeAnnotation))
    if (!hasTypeInfo && route.action.parameters.length > 0) {
        return {
            type: "warning",
            message: errorMessage.ActionDoesNotHaveTypeInfo
        }
    }
    else return { type: "success" }
}

function multipleDecoratorTest(route: RouteInfo, allRoutes: RouteInfo[]): Issue {
    const decorator = route.action.decorators.filter(x => x.name == "Route")
    if (decorator.length > 1) {
        return {
            type: "error",
            message: errorMessage.MultipleDecoratorNotSupported
        }
    }
    else return { type: "success" }
}

function duplicateRouteTest(route: RouteInfo, allRoutes: RouteInfo[]): Issue {
    const dup = allRoutes.filter(x => x.url == route.url && x.method == route.method)
    if (dup.length > 1) {
        return {
            type: "error",
            message: errorMessage.DuplicateRouteFound.format(dup.map(x => getActionName(x)).join(" "))
        }
    }
    else return { type: "success" }
}

function modelTypeInfoTest(route: RouteInfo, allRoutes: RouteInfo[]): Issue {
    const classes = traverseModel(route.action.parameters)
        .filter(x => x.ctorParameters.every(par => typeof par.typeAnnotation == "undefined"))
        .map(x => x.object)
    log(`[Analyzer] Checking model types ${b(classes)}`)
    //get only unique type
    const noTypeInfo = Array.from(new Set(classes))
    if (noTypeInfo.length > 0) {
        log(`[Analyzer] Model without type information ${b(noTypeInfo.map(x => x.name).join(", "))}`)
        return {
            type: "warning",
            message: errorMessage.ModelWithoutTypeInformation.format(noTypeInfo.map(x => x.name).join(", "))
        }
    }
    else return { type: "success" }
}

function arrayTypeInfoTest(route: RouteInfo, allRoutes: RouteInfo[]): Issue {
    const issues = traverseArray(`${route.controller.name}.${route.action.name}`, route.action.parameters)
    const array = Array.from(new Set(issues))
    if (array.length > 0) {
        log(`[Analyzer] Array without item type information in ${array.join(", ")}`)
        return {
            type: "warning",
            message: errorMessage.ArrayWithoutTypeInformation.format(array.join(", "))
        }
    }
    else return { type: 'success' }
}

/* ------------------------------------------------------------------------------- */
/* -------------------------------- ANALYZER ------------------------------------- */
/* ------------------------------------------------------------------------------- */

function analyzeRoute(route: RouteInfo, tests: AnalyzerFunction[], allRoutes: RouteInfo[]): TestResult {
    const issues = tests.map(test => {
        log(`[Analyzer] Analyzing using ${b(test.name)}`)
        return test(route, allRoutes)
    })
        .filter(x => x.type != "success")
    return { route, issues }
}

export function analyzeRoutes(routes: RouteInfo[]) {
    log(`[Analyzer] Analysing ${b(routes.map(x => x.url).join(", "))}`)
    const tests: AnalyzerFunction[] = [
        backingParameterTest, metadataTypeTest, multipleDecoratorTest,
        duplicateRouteTest, modelTypeInfoTest, arrayTypeInfoTest
    ]
    return routes.map(x => analyzeRoute(x, tests, routes))
}

export function printAnalysis(results: TestResult[]) {
    const data = results.map(x => {
        const method = x.route.method.toUpperCase()
        const action = getActionName(x.route)
        const issues = x.issues.map(issue => ` - ${issue.type} ${issue!.message}`)
        return { method, url: x.route.url, action, issues }
    })
    if (data.length > 0) {
        console.log()
        console.log(chalk.bold("Route Analysis Report"))
    }
    data.forEach((x, i) => {
        const action = x.action.padEnd(Math.max(...data.map(x => x.action.length)))
        const method = x.method.padEnd(Math.max(...data.map(x => x.method.length)))
        //const url = x.url.padEnd(Math.max(...data.map(x => x.url.length)))
        const issueColor = (issue: string) => issue.startsWith(" - warning") ? chalk.yellow(issue) : chalk.red(issue)
        const color = x.issues.length == 0 ? (x: string) => x :
            x.issues.some(x => x.startsWith(" - warning")) ? chalk.yellow : chalk.red
        console.log(color(`${i + 1}. ${action} -> ${method} ${x.url}`))
        x.issues.forEach(issue => console.log(issueColor(issue)))
    })
    if (data.length > 0) console.log()
}
