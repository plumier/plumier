import chalk from "chalk"

import { updateRouteAuthorizationAccess } from "./authorization"
import { AnalysisMessage, analyzeModel, ellipsis, printTable } from "./common"
import { Configuration, errorMessage, RouteAnalyzerFunction, RouteAnalyzerIssue, RouteMetadata } from "./types"



// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface TestResult { route: RouteMetadata, issues: RouteAnalyzerIssue[] }


/* ------------------------------------------------------------------------------- */
/* --------------------------- ANALYZER FUNCTION --------------------------------- */
/* ------------------------------------------------------------------------------- */

function backingParameterTest(route: RouteMetadata, allRoutes: RouteMetadata[]): RouteAnalyzerIssue[] {
   if (route.kind === "VirtualRoute") return [{ type: "success" }]
   const ids = route.url.split("/")
      .filter(x => x.startsWith(":"))
      .map(x => x.substring(1).toLowerCase())
   const missing = ids.filter(id => route.action.parameters.map(x => x.name.toLowerCase()).indexOf(id) === -1)
   if (missing.length > 0) {
      return [{
         type: "error",
         message: errorMessage.RouteDoesNotHaveBackingParam.format(missing.join(", "))
      }]
   }
   else return [{ type: "success" }]
}

function duplicateRouteTest(route: RouteMetadata, allRoutes: RouteMetadata[]): RouteAnalyzerIssue[] {
   const dup = allRoutes.filter(x => x.url == route.url && x.method == route.method)
   if (dup.length > 1) {
      return [{
         type: "error",
         message: errorMessage.DuplicateRouteFound.format(dup.map(x => getActionName(x)).join(" "))
      }]
   }
   else return [{ type: "success" }]
}

function typeInfoTest(route: RouteMetadata, allRoutes: RouteMetadata[]): RouteAnalyzerIssue[] {
   const toRouteAnalyzerIssue = (x: AnalysisMessage) => {
      if (x.issue === "NoProperties") return { type: "warning" as "warning", message: errorMessage.ModelWithoutTypeInformation.format(x.location) }
      if (x.issue === "ArrayTypeMissing") return { type: "warning" as "warning", message: errorMessage.ArrayWithoutTypeInformation.format(x.location) }
      return { type: "warning" as "warning", message: errorMessage.PropertyWithoutTypeInformation.format(x.location) }
   }
   if (route.kind === "VirtualRoute") return [{ type: "success" }]
   const issues: RouteAnalyzerIssue[] = []
   for (const prop of route.action.parameters) {
      if (prop.typeClassification === "Primitive") continue
      const location = `${route.controller.name}.${route.action.name}.${prop.name}`
      if (prop.type === Object || prop.type === undefined)
         issues.push({ type: "warning", message: errorMessage.ActionParameterDoesNotHaveTypeInfo.format(location) })
      else if (Array.isArray(prop.type) && prop.type[0] === Object)
         issues.push({ type: "warning", message: errorMessage.ActionParameterDoesNotHaveTypeInfo.format(location) })
      else {
         const iss = analyzeModel(prop.type).map(x => toRouteAnalyzerIssue(x))
         issues.push(...iss)
      }
   }
   if (issues.length > 0)
      return issues
   else return [{ type: "success" }]
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
   const issues = []
   for (const test of tests) {
      const result = test(route, allRoutes).filter(x => x.type !== "success")
      issues.push(...result)
   }
   return { route, issues }
}

function analyzeRoutes(routes: RouteMetadata[], config: Configuration) {
   const tests: RouteAnalyzerFunction[] = [
      backingParameterTest, duplicateRouteTest, typeInfoTest,
   ]
   updateRouteAuthorizationAccess(routes, config)
   return routes.map(x => analyzeRoute(x, tests.concat(config.analyzers || []), routes))
}

function printAnalysis(results: TestResult[]) {
   console.log()
   console.log("Route Analysis Report")
   if (results.length == 0) console.log("No controller found")
   type ResultGroup = { [group: string]: TestResult[] }
   const group = results.reduce((prev, cur) => {
      const key = cur.route.group ?? "___default___"
      prev[key] = (prev[key] ?? []).concat(cur) 
      return prev
   }, {} as ResultGroup)
   for (const key in group) {
      printRoutes(group[key])
   }
}

function printRoutes(results: TestResult[]) {
   const data = results.map(x => {
      const method = x.route.method.toUpperCase()
      const action = getActionNameForReport(x.route)
      const issues = x.issues.map(issue => ` - ${issue.type} ${issue!.message}`)
      return { method, url: ellipsis(x.route.url, 60), action, issues, access: x.route.access }
   })
   const hasAccess = data.every(x => !!x.access)
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
   console.log()
}

export { analyzeRoutes, printAnalysis }
