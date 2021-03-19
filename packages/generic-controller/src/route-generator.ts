import {
    appendRoute,
    ControllerTransformOption,
    errorMessage,
    findClassRecursive,
    GenericController,
    RouteInfo,
    RouteMetadata,
    transformController,
} from "@plumier/core"
import reflect, { Class } from "@plumier/reflect"
import { isAbsolute, join } from "path"

import { ControllerBuilder } from "./configuration"
import { GenericControllerDecorator } from "./decorator"
import { configureBasicGenericController, configureOneToManyGenericController, genericControllerRegistry } from "./factory"

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

function getControllerBuilderFromConfig(callback?: (builder: ControllerBuilder) => void) {
    const c = new ControllerBuilder();
    if (callback)
        callback(c);
    return c
}

function createBasicGenericControllerByDecorators(type: Class, genericControllers: GenericController, nameConversion: (x: string) => string) {
    const meta = reflect(type)
    const controllers = []
    // basic generic controller
    const decorators = meta.decorators.filter((x: GenericControllerDecorator): x is GenericControllerDecorator => x.name === "plumier-meta:controller")
    for (const decorator of decorators) {
        const config = getControllerBuilderFromConfig(decorator.config)
        const ctl = configureBasicGenericController(type, config, genericControllers[0], nameConversion)
        controllers.push(ctl)
    }
    return controllers
}

function createNestedGenericControllerByDecorators(entity: Class, genericControllers: GenericController, nameConversion: (x: string) => string) {
    const meta = reflect(entity)
    const controllers = []
    // one to many controller on each relation property
    for (const prop of meta.properties) {
        const decorators = prop.decorators.filter((x: GenericControllerDecorator): x is GenericControllerDecorator => x.name === "plumier-meta:controller")
        for (const decorator of decorators) {
            const ctl = configureOneToManyGenericController(entity, getControllerBuilderFromConfig(decorator.config), prop.type[0], prop.name, genericControllers[1], nameConversion)
            controllers.push(ctl)
        }
    }
    return controllers
}

function createGenericControllersByDecorators(controller: Class, genericControllers: GenericController, nameConversion: (x: string) => string) {
    return [
        ...createBasicGenericControllerByDecorators(controller, genericControllers, nameConversion),
        ...createNestedGenericControllerByDecorators(controller, genericControllers, nameConversion)
    ]
}

// --------------------------------------------------------------------- //
// -------------------------- ROUTE GENERATOR -------------------------- //
// --------------------------------------------------------------------- //

interface ClassWithRoot {
    root: string,
    type: Class
}

async function extractController(controller: string | string[] | Class[] | Class, option: ControllerTransformOption): Promise<ClassWithRoot[]> {
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
        return createGenericControllersByDecorators(controller, option.genericController, option.genericControllerNameConversion)
            .map(type => ({ root: "", type }))
    }
    return []
}

async function generateGenericControllerRoutes(controller: string | string[] | Class[] | Class, option?: Partial<ControllerTransformOption>): Promise<RouteMetadata[]> {
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