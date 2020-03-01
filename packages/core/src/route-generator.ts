import { existsSync } from "fs"
import { isAbsolute, join } from "path"
import { ClassReflection, MethodReflection, reflect } from "tinspector"

import { Class, findFilesRecursive } from "./common"
import { errorMessage, HttpMethod, RouteInfo } from "./types"



// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface RouteDecorator { name: "Route", method: HttpMethod, url?: string }
interface VirtualRouteDecorator { name: "VirtualRoute", method: HttpMethod, url: string, access: string }
interface IgnoreDecorator { name: "Ignore" }
interface RootDecorator { name: "Root", url: string }
interface TransformOption { root?: string }

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

function getControllerRoutes(root: string, controller: ClassReflection): string[] {
   const decs: RootDecorator[] = controller.decorators.filter((x: RootDecorator) => x.name == "Root")
   if (decs.length > 0) {
      return decs.slice().reverse().map(x => transformDecorator(root, "", x))
   }
   else {
      return [createRoute(root, striveController(controller.name))]
   }
}


function getRoot(rootPath: string, path: string) {
   const part = path.slice(rootPath.length).split("/").filter(x => !!x)
      .slice(0, -1)
   return (part.length === 0) ? undefined : createRoute(...part)
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
   const controllerRoutes = getControllerRoutes(opt && opt.root || "", controller)
   const infos: RouteInfo[] = []

   for (const ctl of controllerRoutes) {
      for (const method of controller.methods) {
         if (method.decorators.some((x: IgnoreDecorator | RouteDecorator) => x.name == "Ignore" || x.name == "Route"))
            infos.push(...transformMethodWithDecorator(ctl, controller, method))
         else
            infos.push(...transformMethod(ctl, controller, method))
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


export { generateRoutes, RouteDecorator, IgnoreDecorator, RootDecorator, VirtualRouteDecorator }

