import { findClassRecursive, errorMessage, RouteMetadata, RouteInfo, appendRoute, transformController, GenericController } from "@plumier/core"
import reflect, { Class } from "@plumier/reflect"
import { createGenericControllers, genericControllerRegistry } from "./factory"
import { isAbsolute, join } from "path"

interface TransformOption {
    rootDir?: string
    rootPath?: string,
    group?: string,
    directoryAsPath?: boolean,
    genericController?: GenericController
    genericControllerNameConversion?: (x: string) => string
}

type TransformControllerOption = Required<Omit<TransformOption, "genericController">> & { genericController?: GenericController }

interface ClassWithRoot {
    root: string,
    type: Class
}


async function extractController(controller: string | string[] | Class[] | Class, option: TransformControllerOption): Promise<ClassWithRoot[]> {
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
    // entity marked with generic controller
    if (!!genericControllerRegistry.get(meta.type)) {
        if (!option.genericController)
            throw new Error(errorMessage.GenericControllerRequired)
        return createGenericControllers(controller, option.genericController, option.genericControllerNameConversion)
            .map(type => ({ root: "", type }))
    }
    return []
}

async function generateGenericControllerRoutes(controller: string | string[] | Class[] | Class, option?: TransformOption): Promise<RouteMetadata[]> {
    const opt = {
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

export { generateGenericControllerRoutes }