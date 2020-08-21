import { ClassReflection, MethodReflection, reflect } from "tinspector"

import { Class, findFilesRecursive } from "./common"
import { createGenericControllers, genericControllerRegistry, DefaultControllerGeneric, DefaultOneToManyControllerGeneric } from "./generic-controller"
import { GenericController, HttpMethod, RouteInfo, RouteMetadata } from "./types"
import { x, exist } from '@hapi/joi'
import { existsSync } from 'fs-extra'


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface RouteDecorator { name: "plumier-meta:route", method: HttpMethod, url?: string }
interface IgnoreDecorator { name: "plumier-meta:ignore", action?: string | string[] }
interface RootDecorator { name: "plumier-meta:root", url: string }
interface TransformOption {
   rootPath?: string,
   group?: string,
   directoryAsPath?: boolean,
   genericController?: GenericController
   genericControllerNameConversion?: (x: string) => string
}

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
   const decs: RootDecorator[] = controller.decorators.filter((x: RootDecorator) => x.name == "plumier-meta:root")
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

function findClassRecursive(path: string) {
   //read all files and get module reflection
   const files = findFilesRecursive(path)
   const result = []
   for (const file of files) {
      const root = getRoot(path, file) ?? ""
      for (const member of (reflect(file).members as ClassReflection[])) {
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

function transformMethodWithDecorator(root: string, controller: ClassReflection, method: MethodReflection, group?: string): RouteInfo[] {
   if (method.decorators.some((x: IgnoreDecorator) => x.name == "plumier-meta:ignore")) return []
   const result = { kind: "ActionRoute" as "ActionRoute", group, action: method, controller }
   const infos: RouteInfo[] = []
   for (const decorator of (method.decorators.slice().reverse() as RouteDecorator[])) {
      if (decorator.name === "plumier-meta:route")
         infos.push({
            ...result,
            method: decorator.method,
            url: transformDecorator(root, method.name, decorator)
         })
   }
   return infos
}

function transformMethod(root: string, controller: ClassReflection, method: MethodReflection, group?: string): RouteInfo[] {
   return [{
      kind: "ActionRoute",
      group, method: "get",
      url: appendRoute(root, method.name),
      controller,
      action: method
   }]
}

function isController(meta: ClassReflection) {
   return !!meta.name.match(/controller$/i) || !!meta.decorators.find((x: RootDecorator) => x.name === "plumier-meta:root")
}

function isGenericController(meta: ClassReflection) {
   const cache = genericControllerRegistry.get(meta.type)
   return !!cache
}

function transformController(object: Class, opt: Required<TransformOption>) {
   const controller = reflect(object)
   const rootRoutes = getRootRoutes(opt.rootPath, controller)
   const infos: RouteInfo[] = []
   // check for class @route.ignore()
   const ignoreDecorator = controller.decorators.find((x: IgnoreDecorator): x is IgnoreDecorator => x.name === "plumier-meta:ignore")
   // if has @route.ignore() (without specify method) than ignore immediately
   const ignoredMethods = ignoreDecorator?.action === undefined ? [] :
      typeof ignoreDecorator.action === "string" ? [ignoreDecorator.action] : ignoreDecorator.action
   if (ignoreDecorator && ignoredMethods.length === 0) return []

   for (const ctl of rootRoutes) {
      for (const method of controller.methods) {
         // if method in ignored list then skip
         if (ignoredMethods.some(x => x === method.name)) continue
         if (method.decorators.some((x: IgnoreDecorator | RouteDecorator) => x.name == "plumier-meta:ignore" || x.name == "plumier-meta:route"))
            infos.push(...transformMethodWithDecorator(ctl, controller, method, opt.group))
         else
            infos.push(...transformMethod(ctl, controller, method, opt.group))
      }
   }
   return infos
}

function extractController(controller: string | Class[] | Class, option: Required<TransformOption>): { root: string, type: Class }[] {
   if (typeof controller === "string") {
      if (!existsSync(controller)) return []
      const types = findClassRecursive(controller)
      const result = []
      for (const type of types) {
         const ctl = extractController(type.type, option)
         result.push(...ctl.map(x => ({
            root: option.directoryAsPath ? type.root : "",
            type: x.type
         })))
      }
      return result
   }
   else if (Array.isArray(controller)) {
      const result = []
      for (const item of controller) {
         const ctl = extractController(item, option)
         result.push(...ctl)
      }
      return result
   }
   const meta = reflect(controller)
   // common controller
   if (isController(meta)) return [{ root: "", type: controller }]
   // entity marked with generic controller
   if (isGenericController(meta)) {
      return createGenericControllers(controller, option.genericController, option.genericControllerNameConversion)
         .map(type => ({ root: "", type }))
   }
   return []
}

function generateRoutes(controller: string | Class[] | Class, option?: TransformOption): RouteMetadata[] {
   const opt: Required<TransformOption> = {
      genericController: [DefaultControllerGeneric, DefaultOneToManyControllerGeneric],
      genericControllerNameConversion: (x: string) => x,
      group: undefined as any, rootPath: "",
      directoryAsPath: true,
      ...option
   }
   const controllers = extractController(controller, opt)
   let routes: RouteInfo[] = []
   for (const controller of controllers) {
      routes.push(...transformController(controller.type, {
         ...opt,
         rootPath: appendRoute(controller.root, opt.rootPath)
      }))
   }
   return routes
}

export { generateRoutes, RouteDecorator, IgnoreDecorator, RootDecorator, appendRoute, findClassRecursive }

