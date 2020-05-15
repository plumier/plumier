import chalk from "chalk"
import { ClassReflection, ParameterReflection, PropertyReflection, reflect } from "tinspector"

import { updateRouteAuthorizationAccess } from "./authorization"
import { Class, isCustomClass, printTable, ellipsis } from "./common"
import { Configuration, errorMessage, RouteAnalyzerFunction, RouteAnalyzerIssue, RouteMetadata, RouteInfo } from "./types"



// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //


type PropOrParamReflection = PropertyReflection | ParameterReflection
interface TestResult { route: RouteMetadata, issues: RouteAnalyzerIssue[] }


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

function backingParameterTest(route: RouteMetadata, allRoutes: RouteMetadata[]): RouteAnalyzerIssue {
   if (route.kind === "VirtualRoute") return { type: "success" }
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

function metadataTypeTest(route: RouteMetadata, allRoutes: RouteMetadata[]): RouteAnalyzerIssue {
   if (route.kind === "VirtualRoute") return { type: "success" }
   const hasTypeInfo = route.action
      .parameters.some(x => Boolean(x.type))
   if (!hasTypeInfo && route.action.parameters.length > 0) {
      return {
         type: "warning",
         message: errorMessage.ActionParameterDoesNotHaveTypeInfo
      }
   }
   else return { type: "success" }
}

function duplicateRouteTest(route: RouteMetadata, allRoutes: RouteMetadata[]): RouteAnalyzerIssue {
   const dup = allRoutes.filter(x => x.url == route.url && x.method == route.method)
   if (dup.length > 1) {
      return {
         type: "error",
         message: errorMessage.DuplicateRouteFound.format(dup.map(x => getActionName(x)).join(" "))
      }
   }
   else return { type: "success" }
}

function modelTypeInfoTest(route: RouteMetadata, allRoutes: RouteMetadata[]): RouteAnalyzerIssue {
   if (route.kind === "VirtualRoute") return { type: "success" }
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

function arrayTypeInfoTest(route: RouteMetadata, allRoutes: RouteMetadata[]): RouteAnalyzerIssue {
   if (route.kind === "VirtualRoute") return { type: "success" }
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

function getActionName(route: RouteMetadata) {
   if (route.kind === "ActionRoute")
      return `${route.controller.name}.${route.action.name}(${route.action.parameters.map(x => x.name).join(", ")})`
   else
      return `${route.provider.name}`
}

function getActionNameForReport(route: RouteMetadata) {
   const origin = getActionName(route)
   if (route.kind === "ActionRoute") {
      if (origin.length > 40)
         return `${ellipsis(route.controller.name, 25)}.${ellipsis(route.action.name, 15)}`
      else
         return origin
   }
   else {
      return ellipsis(origin, 40)
   }
}

function analyzeRoute(route: RouteMetadata, tests: RouteAnalyzerFunction[], allRoutes: RouteMetadata[]): TestResult {
   const issues = tests.map(test => test(route, allRoutes)).filter(x => x.type != "success")
   return { route, issues }
}

function analyzeRoutes(routes: RouteMetadata[], config: Configuration) {
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
      const action = getActionNameForReport(x.route)
      const issues = x.issues.map(issue => ` - ${issue.type} ${issue!.message}`)
      return { method, url: ellipsis(x.route.url, 60), action, issues, access: x.route.access }
   })
   const hasAccess = data.every(x => !!x.access)
   console.log()
   console.log("Route Analysis Report")
   if (data.length == 0) console.log("No controller found")
   printTable([
      "action",
      { property: x => `->` },
      hasAccess ? "access" : undefined,
      "method",
      "url"
   ], data, {
      onPrintRow: (row, data) => {
         const log = data.issues.length === 0 ? (x: string) => x :
            data.issues.some(x => x.indexOf("- error") > 0) ? chalk.red : chalk.yellow
         return log([row, ...data.issues].join("\n"))
      }
   })
   if (data.length > 0) console.log()
}

export { analyzeRoutes, printAnalysis }
