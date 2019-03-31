import chalk from "chalk"
import { existsSync } from "fs"
import { isAbsolute, join } from "path"
import { ClassReflection, MethodReflection, ParameterReflection, PropertyReflection, reflect } from "tinspector"

import { Class, findFilesRecursive, isCustomClass } from "./common"
import { errorMessage } from "./error-message"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

type HttpMethod = "post" | "get" | "put" | "delete" | "patch" | "head" | "trace" | "options"
interface RouteDecorator { name: "Route", method: HttpMethod, url?: string }
interface IgnoreDecorator { name: "Ignore" }
interface RootDecorator { name: "Root", url: string }


type AnalyzerFunction = (route: RouteInfo, allRoutes: RouteInfo[]) => Issue
type PropOrParamReflection = PropertyReflection | ParameterReflection
interface Issue { type: "error" | "warning" | "success", message?: string }
interface TestResult { route: RouteInfo, issues: Issue[] }

interface TransformOption { root?: string }


interface RouteInfo {
   url: string,
   method: HttpMethod
   action: MethodReflection
   controller: ClassReflection
   access?: string
}

/* ------------------------------------------------------------------------------- */
/* ------------------------------- HELPERS --------------------------------------- */
/* ------------------------------------------------------------------------------- */

function createRoute(...args: string[]): string {
   return "/" + args
      .filter(x => !!x)
      .map(x => x.toLowerCase())
      .map(x => x.startsWith("/") ? x.slice(1) : x)
      .map(x => x.endsWith("/") ? x.slice(0, -1) : x)
      .filter(x => !!x)
      .join("/")
}

function striveController(name: string) {
   return name.substring(0, name.lastIndexOf("Controller")).toLowerCase()
}

function getControllerRoute(controller: ClassReflection): string[] {
   const root: RootDecorator[] = controller.decorators.filter((x: RootDecorator) => x.name == "Root")
   return root.length > 0 ? root.slice().reverse().map(x => x.url) : [`/${striveController(controller.name)}`]
}

function getActionName(route: RouteInfo) {
   return `${route.controller.name}.${route.action.name}(${route.action.parameters.map(x => x.name).join(", ")})`
}

function getRoot(rootPath: string, path: string) {
   const part = path.slice(rootPath.length).split("/").filter(x => !!x)
      .slice(0, -1)
   return (part.length === 0) ? undefined : createRoute(...part)
}

/* ------------------------------------------------------------------------------- */
/* ---------------------------------- TRANSFORMER -------------------------------- */
/* ------------------------------------------------------------------------------- */

function transformDecorator(root: string, actionName: string, actionDecorator: RouteDecorator) {
   //absolute route override
   if (actionDecorator.url && actionDecorator.url.startsWith("/"))
      return actionDecorator.url
   //ignore override
   else if (actionDecorator.url === "")
      return root
   //relative route override
   else {
      return createRoute(root, actionDecorator.url || actionName.toLowerCase())
   }
}

function transformMethodWithDecorator(root: string, controller: ClassReflection, method: MethodReflection): RouteInfo[] {
   if (method.decorators.some((x: IgnoreDecorator) => x.name == "Ignore")) return []
   const result = <RouteInfo>{ action: method, controller }
   const infos: RouteInfo[] = []
   for (const decorator of (method.decorators.slice().reverse() as RouteDecorator[])) {
      if (decorator.name === "Route")
         infos.push({
            ...result,
            method: decorator.method,
            url: transformDecorator(root, method.name, decorator)
         })
   }
   return infos
}

function transformMethod(root: string, controller: ClassReflection, method: MethodReflection): RouteInfo[] {
   return [<RouteInfo>{
      method: "get",
      url: createRoute(root, method.name),
      controller,
      action: method,
   }]
}

function transformController(object: ClassReflection | Class, opt?: TransformOption) {
   const controller = typeof object === "function" ? reflect(object) : object
   if (!controller.name.toLowerCase().endsWith("controller")) return []
   const controllerRoutes = getControllerRoute(controller)
   const infos: RouteInfo[] = []

   for (const ctl of controllerRoutes) {
      const root = createRoute(opt && opt.root || "", ctl)
      for (const method of controller.methods) {
         if (method.decorators.some((x: IgnoreDecorator | RouteDecorator) => x.name == "Ignore" || x.name == "Route"))
            infos.push(...transformMethodWithDecorator(root, controller, method))
         else
            infos.push(...transformMethod(root, controller, method))
      }
   }
   return infos
}

function transformModule(path: string): RouteInfo[] {
   //read all files and get module reflection
   const files = findFilesRecursive(path)
   const infos: RouteInfo[] = []
   for (const file of files) {
      const root = getRoot(path, file)
      for (const member of (reflect(file).members as ClassReflection[])) {
         if (member.kind === "Class" && member.name.toLocaleLowerCase().endsWith("controller"))
            infos.push(...transformController(member, { root }))
      }
   }
   return infos
}

function generateRoutes(executionPath: string, controller: string | Class[] | Class) {
   let routes: RouteInfo[] = []
   if (typeof controller === "string") {
      const path = isAbsolute(controller) ? controller :
         join(executionPath, controller)
      if (!existsSync(path))
         throw new Error(errorMessage.ControllerPathNotFound.format(path))
      routes = transformModule(path)
   }
   else if (Array.isArray(controller)) {
      routes = controller.map(x => transformController(x))
         .flatten()
   }
   else {
      routes = transformController(controller)
   }
   return routes
}

/* ------------------------------------------------------------------------------- */
/* --------------------------- ANALYZER FUNCTION --------------------------------- */
/* ------------------------------------------------------------------------------- */

//------ Analyzer Helpers
function getModelsInParameters(par: PropOrParamReflection[]) {
   return par
      .map((x, i) => ({ type: x.type, index: i }))
      .filter(x => x.type && isCustomClass(x.type))
      .map(x => ({ meta: reflect((Array.isArray(x.type) ? x.type[0] : x.type) as Class), index: x.index }))
}

function traverseModel(par: PropOrParamReflection[]): ClassReflection[] {
   const models = getModelsInParameters(par).map(x => x.meta)
   const child = models.map(x => traverseModel(x.properties))
      .filter((x): x is ClassReflection[] => Boolean(x))
      .reduce((a, b) => a!.concat(b!), [] as ClassReflection[])
   return models.concat(child)
}

function traverseArray(parent: string, par: PropOrParamReflection[]): string[] {
   const models = getModelsInParameters(par)
   if (models.length > 0) {
      return models.map((x, i) => traverseArray(x.meta.name, x.meta.properties))
         .flatten()
   }
   return par.filter(x => x.type === Array)
      .map(x => `${parent}.${x.name}`)
}

//----- 

function backingParameterTest(route: RouteInfo, allRoutes: RouteInfo[]): Issue {
   const ids = route.url.split("/")
      .filter(x => x.startsWith(":"))
      .map(x => x.substring(1).toLowerCase())
   const missing = ids.filter(id => route.action.parameters.map(x => x.name.toLowerCase()).indexOf(id) === -1)
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
      .parameters.some(x => Boolean(x.type))
   if (!hasTypeInfo && route.action.parameters.length > 0) {
      return {
         type: "warning",
         message: errorMessage.ActionDoesNotHaveTypeInfo
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
      .filter(x => x.properties.every(par => typeof par.type == "undefined"))
      .map(x => x.type)
   //get only unique type
   const noTypeInfo = Array.from(new Set(classes))
   if (noTypeInfo.length > 0) {
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
      return test(route, allRoutes)
   })
      .filter(x => x.type != "success")
   return { route, issues }
}

function analyzeRoutes(routes: RouteInfo[]) {
   const tests: AnalyzerFunction[] = [
      backingParameterTest, metadataTypeTest,
      duplicateRouteTest, modelTypeInfoTest,
      arrayTypeInfoTest
   ]
   return routes.map(x => analyzeRoute(x, tests, routes))
}

function printAnalysis(results: TestResult[]) {
   const data = results.map(x => {
      const method = x.route.method.toUpperCase()
      const action = getActionName(x.route)
      const issues = x.issues.map(issue => ` - ${issue.type} ${issue!.message}`)
      return { method, url: x.route.url, action, issues, access: x.route.access }
   })
   console.log()
   console.log("Route Analysis Report")
   if (data.length == 0) console.log("No controller found")
   const paddings = {
      number: data.length.toString().length,
      action: Math.max(...data.map(x => x.action.length)),
      method: Math.max(...data.map(x => x.method.length)),
      access: Math.max(...data.map(x => x.access && x.access.length || 0)),
   }
   data.forEach((x, i) => {
      const num = (i + 1).toString().padStart(paddings.number)
      const action = x.action.padEnd(paddings.action)
      const method = x.method.padEnd(paddings.method)
      const access = x.access && (" " + x.access.padEnd(paddings.access)) || ""
      const color = x.issues.length === 0 ? (x: string) => x : x.issues.some(x => x.startsWith(" - error")) ? chalk.red : chalk.yellow
      console.log(color(`${num}. ${action} ->${access} ${method} ${x.url}`))
      x.issues.forEach(x => {
         const color = x.startsWith(" - warning") ? chalk.yellow : chalk.red
         console.log(color(x))
      })
   })
   if (data.length > 0) console.log()
}

export { analyzeRoutes, generateRoutes, printAnalysis, RouteInfo, HttpMethod, RouteDecorator, IgnoreDecorator, RootDecorator }