import { isAbsolute, join } from "path"
import { ClassReflection, MethodReflection, reflect } from "tinspector"

import { Class, findFilesRecursive } from "./common"
import {
   createGenericControllers,
   DefaultControllerGeneric,
   DefaultOneToManyControllerGeneric,
   genericControllerRegistry,
} from "./generic-controller"
import { GenericController, HttpMethod, RouteInfo, RouteMetadata } from "./types"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface RouteDecorator { name: "plumier-meta:route", method: HttpMethod, url?: string, map: any }
interface IgnoreDecorator { name: "plumier-meta:ignore" }
interface RootDecorator { name: "plumier-meta:root", url: string, map: any }
interface TransformOption {
   rootDir?: string
   rootPath?: string,
   group?: string,
   directoryAsPath?: boolean,
   genericController?: GenericController
   genericControllerNameConversion?: (x: string) => string
}
interface ClassWithRoot {
   root: string,
   type: Class
}
interface RouteRoot { root: string, map: any }

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

function getRootRoutes(root: string, controller: ClassReflection): RouteRoot[] {
   const decs: RootDecorator[] = controller.decorators.filter((x: RootDecorator) => x.name == "plumier-meta:root")
   if (decs.length > 0) {
      const result = []
      for (let i = decs.length; i--;) {
         const item = decs[i]
         result.push({ root: transformDecorator(root, "", item), map: item.map ?? {} })
      }
      return result
   }
   else {
      return [{ root: appendRoute(root, striveController(controller.name)), map: {} }]
   }
}

function getRoot(rootPath: string, path: string) {
   // directoryAsPath should not working with glob
   if (rootPath.indexOf("*") >= 0) return
   const part = path.slice(rootPath.length).split("/").filter(x => !!x)
      .slice(0, -1)
   return (part.length === 0) ? undefined : appendRoute(...part)
}

async function findClassRecursive(path: string): Promise<ClassWithRoot[]> {
   //read all files and get module reflection
   const files = await findFilesRecursive(path)
   const result = []
   for (const file of files) {
      const root = getRoot(path, file) ?? ""
      for (const member of reflect(file).members) {
         if (member.kind === "Class")
            result.push({ root, type: member.type })
      }
   }
   return result
}


class ParamMapper {
   constructor(private map:any[]){}
   alias(parName:string) {
      let result:string|undefined
      for (const item of this.map) {
         result = item[parName]
         if(!!result) break
      }
      return result ?? parName
   }
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

function transformMethodWithDecorator(root: RouteRoot, controller: ClassReflection, method: MethodReflection, group?: string): RouteInfo[] {
   if (method.decorators.some((x: IgnoreDecorator) => x.name == "plumier-meta:ignore")) return []
   const result = { kind: "ActionRoute" as "ActionRoute", group, action: method, controller }
   const infos: RouteInfo[] = []
   const rootMap = [root.map]
   for (const decorator of (method.decorators.slice().reverse() as RouteDecorator[])) {
      if (decorator.name === "plumier-meta:route")
         infos.push({
            ...result,
            method: decorator.method,
            url: transformDecorator(root.root, method.name, decorator),
            paramMapper: new ParamMapper(rootMap.concat(decorator.map ?? {}))
         })
   }
   return infos
}

function transformMethod(root: RouteRoot, controller: ClassReflection, method: MethodReflection, group?: string): RouteInfo[] {
   return [{
      kind: "ActionRoute",
      group, method: "get",
      url: appendRoute(root.root, method.name),
      controller,
      action: method,
      paramMapper: new ParamMapper([root.map]) 
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
   if (ignoreDecorator)
      return []

   for (const ctl of rootRoutes) {
      for (const method of controller.methods) {
         if (method.decorators.some((x: IgnoreDecorator | RouteDecorator) => x.name == "plumier-meta:ignore" || x.name == "plumier-meta:route"))
            infos.push(...transformMethodWithDecorator(ctl, controller, method, opt.group))
         else
            infos.push(...transformMethod(ctl, controller, method, opt.group))
      }
   }
   return infos
}

async function extractController(controller: string | string[] | Class[] | Class, option: Required<TransformOption>): Promise<ClassWithRoot[]> {
   if (typeof controller === "string") {
      const ctl = isAbsolute(controller) ? controller : join(option.rootDir, controller)
      const types = await findClassRecursive(ctl)
      const result = []
      for (const type of types) {
         const ctl = await extractController(type.type, option)
         result.push(...ctl.map(x => ({
            root: option.directoryAsPath ? type.root : "",
            type: x.type
         })))
      }
      return result
   }
   else if (Array.isArray(controller)) {
      const raw = controller as (string | Class)[]
      const controllers = await Promise.all(raw.map(x => extractController(x, option)))
      return controllers.flatten()
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

async function generateRoutes(controller: string | string[] | Class[] | Class, option?: TransformOption): Promise<RouteMetadata[]> {
   const opt: Required<TransformOption> = {
      genericController: [DefaultControllerGeneric, DefaultOneToManyControllerGeneric],
      genericControllerNameConversion: (x: string) => x,
      group: undefined as any, rootPath: "", rootDir: "",
      directoryAsPath: true,
      ...option
   }
   const controllers = await extractController(controller, opt)
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

