import { existsSync } from "fs"
import { ClassReflection, MethodReflection, reflect } from "tinspector"

import { Class, findFilesRecursive } from "./common"
import { errorMessage, HttpMethod, RouteInfo, RouteMetadata } from "./types"



// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface RouteDecorator { name: "Route", method: HttpMethod, url?: string }
interface IgnoreDecorator { name: "Ignore" }
interface RootDecorator { name: "Root", url: string }
interface TransformOption { root?: string }

/* ------------------------------------------------------------------------------- */
/* ------------------------------- HELPERS --------------------------------------- */
/* ------------------------------------------------------------------------------- */

function appendRoute(...args: string[]): string {
   return "/" + args
      .filter(x => !!x)
      .map(x => x.toLowerCase())
      .map(x => x.startsWith("/") ? x.slice(1) : x)
      .map(x => x.endsWith("/") ? x.slice(0, -1) : x)
      .filter(x => !!x)
      .join("/")
}

function striveController(name: string) {
   return name.replace(/controller$/i, "")
}

function getControllerRoutes(root: string, controller: ClassReflection): string[] {
   const decs: RootDecorator[] = controller.decorators.filter((x: RootDecorator) => x.name == "Root")
   if (decs.length > 0) {
      return decs.slice().reverse().map(x => transformDecorator(root, "", x))
   }
   else {
      return [appendRoute(root, striveController(controller.name))]
   }
}


function getRoot(rootPath: string, path: string) {
   const part = path.slice(rootPath.length).split("/").filter(x => !!x)
      .slice(0, -1)
   return (part.length === 0) ? undefined : appendRoute(...part)
}

/* ------------------------------------------------------------------------------- */
/* ---------------------------------- TRANSFORMER -------------------------------- */
/* ------------------------------------------------------------------------------- */

function transformDecorator(root: string, actionName: string, actionDecorator: { url?: string }) {
   //absolute route override
   if (actionDecorator.url && actionDecorator.url.startsWith("/"))
      return actionDecorator.url
   //ignore override
   else if (actionDecorator.url === "")
      return root
   //relative route override
   else {
      return appendRoute(root, actionDecorator.url || actionName.toLowerCase())
   }
}

function transformMethodWithDecorator(root: string, controller: ClassReflection, method: MethodReflection, overridable: boolean): RouteInfo[] {
   if (method.decorators.some((x: IgnoreDecorator) => x.name == "Ignore")) return []
   const result = { kind: "ActionRoute" as "ActionRoute", action: method, controller, overridable }
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

function transformMethod(root: string, controller: ClassReflection, method: MethodReflection, overridable: boolean): RouteInfo[] {
   return [{
      kind: "ActionRoute",
      method: "get",
      url: appendRoute(root, method.name),
      controller,
      action: method,
      overridable
   }]
}

function isController(meta: ClassReflection) {
   return !!meta.name.match(/controller$/i) || !!meta.decorators.find((x: RootDecorator) => x.name === "Root")
}

function transformController(object: ClassReflection | Class, overridable: boolean, opt?: TransformOption) {
   const controller = typeof object === "function" ? reflect(object) : object
   if (!isController(controller)) return []
   const controllerRoutes = getControllerRoutes(opt && opt.root || "", controller)
   const infos: RouteInfo[] = []

   for (const ctl of controllerRoutes) {
      for (const method of controller.methods) {
         if (method.decorators.some((x: IgnoreDecorator | RouteDecorator) => x.name == "Ignore" || x.name == "Route"))
            infos.push(...transformMethodWithDecorator(ctl, controller, method, overridable))
         else
            infos.push(...transformMethod(ctl, controller, method, overridable))
      }
   }
   return infos
}

function transformModule(path: string, overridable: boolean): RouteInfo[] {
   //read all files and get module reflection
   const files = findFilesRecursive(path)
   const infos: RouteInfo[] = []
   for (const file of files) {
      const root = getRoot(path, file)
      for (const member of (reflect(file).members as ClassReflection[])) {
         if (member.kind === "Class" && isController(member))
            infos.push(...transformController(member, overridable, { root }))
      }
   }
   return infos
}

function generateRoutes(controller: string | Class[] | Class, opt: { overridable: boolean } = { overridable: false }): RouteMetadata[] {
   let routes: RouteInfo[] = []
   if (typeof controller === "string") {
      routes = transformModule(controller, opt.overridable)
   }
   else if (Array.isArray(controller)) {
      routes = controller.map(x => transformController(x, opt.overridable))
         .flatten()
   }
   else {
      routes = transformController(controller, opt.overridable)
   }
   return routes
}

function findDupe(routes: RouteMetadata[], key: string, margin: number): RouteMetadata | undefined {
   for (let i = 0; i < margin; i++) {
      const route = routes[i]
      const curKey = `${route.method}${route.url}`
      if (curKey === key) return route;
   }
}

function mergeRoutes(routes: RouteMetadata[]) {
   const skip: { [key: string]: true } = {}
   const result = []
   for (let i = routes.length - 1; i >= 0; i--) {
      const route = routes[i]
      const curKey = `${route.method}${route.url}`
      if (skip[curKey]) continue;
      if (route.overridable) {
         const replace = findDupe(routes, curKey, i)
         if (replace) skip[curKey] = true
         result.unshift(replace ?? route)
      }
      else {
         result.unshift(route)
      }
   }
   return result
}

export { generateRoutes, RouteDecorator, IgnoreDecorator, RootDecorator, mergeRoutes, appendRoute }

