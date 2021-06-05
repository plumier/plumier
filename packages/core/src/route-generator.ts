import { ClassReflection, MethodReflection, reflect } from "@plumier/reflect"
import { isAbsolute, join } from "path"

import { appendRoute, Class, ClassWithRoot, findClassRecursive, findFilesRecursive } from "./common"
import { GenericControllers, HttpMethod, RouteInfo, RouteMetadata } from "./types"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface RouteDecorator { name: "plumier-meta:route", method: HttpMethod, url?: string, map: any }
interface IgnoreDecorator { name: "plumier-meta:ignore" }
interface RootDecorator { name: "plumier-meta:root", url: string, map: any }
interface ControllerTransformOption {
   rootDir: string
   rootPath: string,
   group: string,
   directoryAsPath: boolean,
   genericController?: GenericControllers
   genericControllerNameConversion: (x: string) => string
}

interface RouteRoot { root: string, map: any }

/* ------------------------------------------------------------------------------- */
/* ------------------------------- HELPERS --------------------------------------- */
/* ------------------------------------------------------------------------------- */


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

class ParamMapper {
   constructor(private map: any[]) { }
   alias(parName: string) {
      let result: string | undefined
      for (const item of this.map) {
         result = item[parName]
         if (!!result) break
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

function isController(controller: Class) {
   const meta = reflect(controller)
   return !!meta.name.match(/controller$/i)
      || !!meta.decorators.find((x: RootDecorator) => x.name === "plumier-meta:root")
}

function transformController(object: Class, opt: ControllerTransformOption) {
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

async function extractController(controller: string | string[] | Class[] | Class, option: ControllerTransformOption): Promise<ClassWithRoot[]> {
   const classes = await findClassRecursive(controller, option)
   return classes.filter(x => isController(x.type))
}

async function generateRoutes(controller: string | string[] | Class[] | Class, option?: Partial<ControllerTransformOption>): Promise<RouteMetadata[]> {
   const opt = <ControllerTransformOption>{
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

export {
   generateRoutes, transformController, RouteDecorator, IgnoreDecorator,
   RootDecorator, ControllerTransformOption
}

