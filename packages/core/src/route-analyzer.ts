import chalk from "chalk"
import { ClassReflection, ParameterReflection, PropertyReflection, reflect } from "tinspector"

import { updateRouteAuthorizationAccess } from "./authorization"
import { Class, isCustomClass, printTable } from "./common"
import { Configuration, errorMessage, RouteAnalyzerFunction, RouteAnalyzerIssue, RouteInfo } from "./types"



// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //


type PropOrParamReflection = PropertyReflection | ParameterReflection
interface TestResult { route: RouteInfo, issues: RouteAnalyzerIssue[] }


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
   return par.filter(x => Array.isArray(x.type) && x.type[0] === Object)
      .map(x => `${parent}.${x.name}`)
}

function backingParameterTest(route: RouteInfo, allRoutes: RouteInfo[]): RouteAnalyzerIssue {
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

function metadataTypeTest(route: RouteInfo, allRoutes: RouteInfo[]): RouteAnalyzerIssue {
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

function duplicateRouteTest(route: RouteInfo, allRoutes: RouteInfo[]): RouteAnalyzerIssue {
   const dup = allRoutes.filter(x => x.url == route.url && x.method == route.method)
   if (dup.length > 1) {
      return {
         type: "error",
         message: errorMessage.DuplicateRouteFound.format(dup.map(x => getActionName(x)).join(" "))
      }
   }
   else return { type: "success" }
}

function modelTypeInfoTest(route: RouteInfo, allRoutes: RouteInfo[]): RouteAnalyzerIssue {
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

function arrayTypeInfoTest(route: RouteInfo, allRoutes: RouteInfo[]): RouteAnalyzerIssue {
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

function getActionName(route: RouteInfo) {
   return `${route.controller.name}.${route.action.name}(${route.action.parameters.map(x => x.name).join(", ")})`
}

function analyzeRoute(route: RouteInfo, tests: RouteAnalyzerFunction[], allRoutes: RouteInfo[]): TestResult {
   const issues = tests.map(test => test(route, allRoutes)).filter(x => x.type != "success")
   return { route, issues }
}

function analyzeRoutes(routes: RouteInfo[], config: Configuration) {
   const tests: RouteAnalyzerFunction[] = [
      backingParameterTest, metadataTypeTest,
      duplicateRouteTest, modelTypeInfoTest,
      arrayTypeInfoTest
   ]
   updateRouteAuthorizationAccess(routes, config)
   return routes.map(x => analyzeRoute(x, tests.concat(config.analyzers || []), routes))
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
   printTable([
      "action",
      { property: x => `->`, },
      { property: "access", paddingRight: 0 },
      "method",
      "url"
   ], data)
   if (data.length > 0) console.log()
}

export { analyzeRoutes, printAnalysis }
