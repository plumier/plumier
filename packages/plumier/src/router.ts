import Debug from "debug";
import * as Fs from "fs";
import { Context } from "koa";
import * as Path from "path";
import Ptr from "path-to-regexp";

import {
    errorMessage,
    IgnoreDecorator,
    MiddlewareDecorator,
    RootDecorator,
    RouteDecorator,
    RouteInfo,
    StringUtil,
} from "./framework";
import { Class } from "./libs/ioc-container";
import { ClassReflection, FunctionReflection, reflect, Reflection } from "./libs/reflect";

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

export function extractDecorators(route: RouteInfo) {
    const classDecorator: MiddlewareDecorator[] = route.controller.decorators.filter(x => x.name == "Middleware")
    const methodDecorator: MiddlewareDecorator[] = route.action.decorators.filter(x => x.name == "Middleware")
    const extract = (d: MiddlewareDecorator[]) => d.map(x => x.value).reduce((a, b) => a.concat(b), [])
    return extract(classDecorator)
        .concat(extract(methodDecorator))
        .reverse()
}

function getActionName(route: RouteInfo) {
    return `${route.controller.name}.${route.action.name}(${route.action.parameters.map(x => x.name).join(", ")})`
}


function resolvePath(path: string): string[] {
    //resolve provided path directory or file
    if (Fs.lstatSync(path).isDirectory())
        return Fs.readdirSync(path)
            //take only *.js 
            .filter(x => Path.extname(x) === ".js")
            //add root path + file name
            .map(x => Path.join(path, x))
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

export function transformController(object: ClassReflection | Class<any>) {
    const controller = typeof object === "function" ? reflect(object) : object
    if (!controller.name.toLowerCase().endsWith("controller")) return []
    return <RouteInfo[]>(controller.methods || []).map(method => {
        //first priority is decorator
        if (method.decorators.some((x: IgnoreDecorator | RouteDecorator) => x.name == "Ignore" || x.name == "Route"))
            return transformRouteDecorator(controller, method)
        else
            return transformRegular(controller, method)
    })
        //ignore undefined
        .filter(x => Boolean(x))
}

export async function transformModule(path: string): Promise<RouteInfo[]> {
    //read all files and get module reflection
    const modules = await Promise.all(
        resolvePath(path)
            //reflect the file
            .map(x => reflect(x)))
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
/* --------------------------------------- ROUTER -------------------------------- */
/* ------------------------------------------------------------------------------- */

export function router(info: RouteInfo, handler: (context: Context, next: () => Promise<any>) => Promise<void>) {
    return async (context: Context, next: () => Promise<any>) => {
        const regexp = Ptr(info.url)
        if(regexp.test(context.path) && context.method.toLowerCase() == info.method){
            await handler(context, next)
        }
        else next()
    }
}

/* ------------------------------------------------------------------------------- */
/* --------------------------- ANALYZER FUNCTION --------------------------------- */
/* ------------------------------------------------------------------------------- */

const log = Debug("plum:analyzer")

function backingParameterTest(route: RouteInfo, allRoutes: RouteInfo[]): Issue {
    const ids = route.url.split("/")
        .filter(x => x.startsWith(":"))
        .map(x => x.substring(1))
    const missing = ids.filter(id => route.action.parameters.map(x => x.name).indexOf(id) === -1)
    if (missing.length > 0) {
        return {
            type: "error",
            message: StringUtil.format(errorMessage.RouteDoesNotHaveBackingParam, missing.join(", "))
        }
    }
    else return { type: "success" }
}

function metadataTypeTest(route: RouteInfo, allRoutes: RouteInfo[]): Issue {
    const hasTypeInfo = route.action
        .parameters.some(x => Boolean(x.typeAnnotation))
    if (!hasTypeInfo) {
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
            message: StringUtil.format(errorMessage.DuplicateRouteFound, dup.map(x => getActionName(x)).join(" "))
        }
    }
    else return { type: "success" }
}


/* ------------------------------------------------------------------------------- */
/* -------------------------------- ANALYZER ------------------------------------- */
/* ------------------------------------------------------------------------------- */

function analyzeRoute(route: RouteInfo, tests: AnalyzerFunction[], allRoutes: RouteInfo[]): TestResult {
    const issues = tests.map(test => test(route, allRoutes))
        .filter(x => x.type != "success")
    return { route, issues }
}

export function analyzeRoutes(routes: RouteInfo[]) {
    const tests: AnalyzerFunction[] = [
        backingParameterTest, metadataTypeTest, multipleDecoratorTest,
        duplicateRouteTest
    ]
    return routes.map(x => analyzeRoute(x, tests, routes))
}


function printTestResult({ route, issues }: TestResult) {
    const method = StringUtil.padRight(route.method.toUpperCase(), 5)
    const action = getActionName(route)
    log(`${action}`)
    log(`${method} ${route.url}`)
    issues.forEach(x => log(` - ${x.type} ${x!.message}`))
}

export function printAnalysis(results: TestResult[]) {
    results.forEach(x => printTestResult(x))
}