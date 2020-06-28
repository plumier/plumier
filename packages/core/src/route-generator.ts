import { ClassReflection, MethodReflection, reflect } from "tinspector"

import { Class, findFilesRecursive } from "./common"
import { HttpMethod, RouteInfo, RouteMetadata } from "./types"



// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface RouteDecorator { name: "Route", method: HttpMethod, url?: string }
interface IgnoreDecorator { name: "Ignore", methods: string[] }
interface RootDecorator { name: "Root", url: string }
interface TransformOption { rootPath?: string, overridable: boolean, group?: string, directoryAsPath?: boolean }

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

function getRootRoutes(root: string, controller: ClassReflection): string[] {
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

function findClassRecursive(path: string, criteria: ((x: ClassReflection) => boolean)) {
   //read all files and get module reflection
   const files = findFilesRecursive(path)
   const result = []
   for (const file of files) {
      const root = getRoot(path, file) ?? ""
      for (const member of (reflect(file).members as ClassReflection[])) {
         if (member.kind === "Class" && criteria(member))
            result.push({ root, type: member.type })
      }
   }
   return result
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

function transformMethodWithDecorator(root: string, controller: ClassReflection, method: MethodReflection, overridable: boolean, group?: string): RouteInfo[] {
   if (method.decorators.some((x: IgnoreDecorator) => x.name == "Ignore")) return []
   const result = { kind: "ActionRoute" as "ActionRoute", group, action: method, controller, overridable }
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

function transformMethod(root: string, controller: ClassReflection, method: MethodReflection, overridable: boolean, group?: string): RouteInfo[] {
   return [{
      kind: "ActionRoute",
      group, method: "get",
      url: appendRoute(root, method.name),
      controller,
      action: method,
      overridable
   }]
}

function isController(meta: ClassReflection) {
   return !!meta.name.match(/controller$/i) || !!meta.decorators.find((x: RootDecorator) => x.name === "Root")
}

function transformController(object: Class, opt: TransformOption) {
   const controller = reflect(object)
   if (!isController(controller)) return []
   const rootRoutes = getRootRoutes(opt && opt.rootPath || "", controller)
   const infos: RouteInfo[] = []
   // check for class @route.ignore()
   const ignoreDecorator = controller.decorators.find((x: IgnoreDecorator): x is IgnoreDecorator => x.name === "Ignore")
   // if has @route.ignore() (without specify method) than ignore immediately
   if (ignoreDecorator && ignoreDecorator.methods.length === 0) return []
   const ignoredMethods = ignoreDecorator?.methods || []

   for (const ctl of rootRoutes) {
      for (const method of controller.methods) {
         // if method in ignored list then skip
         if (ignoredMethods.some(x => x === method.name)) continue
         if (method.decorators.some((x: IgnoreDecorator | RouteDecorator) => x.name == "Ignore" || x.name == "Route"))
            infos.push(...transformMethodWithDecorator(ctl, controller, method, opt.overridable, opt.group))
         else
            infos.push(...transformMethod(ctl, controller, method, opt.overridable, opt.group))
      }
   }
   return infos
}

function transformModule(path: string, opt: TransformOption): RouteInfo[] {
   const types = findClassRecursive(path, isController)
   const infos: RouteInfo[] = []
   for (const type of types) {
      const rootPath = opt.directoryAsPath ? appendRoute(opt.rootPath ?? "", type.root) : opt.rootPath ?? ""
      infos.push(...transformController(type.type, { ...opt, rootPath }))
   }
   return infos
}

function generateRoutes(controller: string | Class[] | Class, option: TransformOption = { overridable: false }): RouteMetadata[] {
   const opt = { ...option, directoryAsPath: option.directoryAsPath ?? true }
   let routes: RouteInfo[] = []
   if (typeof controller === "string") {
      routes = transformModule(controller, opt)
   }
   else if (Array.isArray(controller)) {
      routes = controller.map(x => transformController(x, opt))
         .flatten()
   }
   else {
      routes = transformController(controller, opt)
   }
   return routes
}

// --------------------------------------------------------------------- //
// ---------------------------- MERGE ROUTES --------------------------- //
// --------------------------------------------------------------------- //

function createKey(route: RouteMetadata) {
   // create unique key for route
   // post users/:userId/animals = post users/:pid/animals
   // post users/:userId !== post users/:userId/animals
   // replace any :param into :par
   const newUrl = route.url.replace(/:\w*\d*/g, ":par")
   return `${route.method}${newUrl}`
}

function findDupe(routes: RouteMetadata[], key: string, margin: number): RouteMetadata | undefined {
   for (let i = 0; i < margin; i++) {
      const route = routes[i]
      const curKey = createKey(route)
      if (curKey === key) return route;
   }
}

function mergeRoutes(routes: RouteMetadata[]) {
   const skip: { [key: string]: true } = {}
   const result = []
   // loop routes from bottom to the top
   // move duplicate routes (overridable) at the top of collection 
   // into the appropriate location at the bottom
   // intended to group similar routes
   for (let i = routes.length - 1; i >= 0; i--) {
      const route = routes[i]
      const curKey = createKey(route)
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

export { generateRoutes, RouteDecorator, IgnoreDecorator, RootDecorator, mergeRoutes, appendRoute, findClassRecursive }

