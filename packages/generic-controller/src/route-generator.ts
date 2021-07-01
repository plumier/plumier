import {
    appendRoute,
    ControllerTransformOption,
    errorMessage,
    findClassRecursive,
    GenericControllers,
    RouteInfo,
    RouteMetadata,
    transformController,
} from "@plumier/core"
import reflect, { Class } from "@plumier/reflect"
import { isAbsolute, join } from "path"

import { ControllerBuilder } from "./configuration"
import { GenericControllerDecorator } from "./decorator"
import { createGenericControllerType, createNestedGenericControllerType } from "./factory"
import { genericControllerRegistry } from "./helper"

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

function getControllerBuilderFromConfig(callback?: (builder: ControllerBuilder) => void) {
    const c = new ControllerBuilder();
    if (callback)
        callback(c);
    return c
}

function createBasicGenericControllerByDecorators(type: Class, genericControllers: GenericControllers, nameConversion: (x: string) => string) {
    const meta = reflect(type)
    const controllers = []
    // basic generic controller
    const decorators = meta.decorators.filter((x: GenericControllerDecorator): x is GenericControllerDecorator => x.name === "plumier-meta:controller")
    for (const decorator of decorators) {
        const builder = getControllerBuilderFromConfig(decorator.config)
        const ctl = createGenericControllerType(type, {
            builder,
            controller: genericControllers[0],
            nameConversion,
            skipTag: false
        })
        controllers.push(ctl)
    }
    return controllers
}

function createNestedGenericControllerByDecorators(entity: Class, genericControllers: GenericControllers, nameConversion: (x: string) => string) {
    const meta = reflect(entity)
    const controllers = []
    // one to many controller on each relation property
    for (const prop of meta.properties) {
        const decorators = prop.decorators.filter((x: GenericControllerDecorator): x is GenericControllerDecorator => x.name === "plumier-meta:controller")
        for (const decorator of decorators) {
            const builder = getControllerBuilderFromConfig(decorator.config)
            const ctl = createNestedGenericControllerType([decorator.target, prop.name], {
                builder,
                controller: genericControllers[1],
                nameConversion,
                skipTag: false
            })
            controllers.push(ctl)
        }
    }
    return controllers
}

function createGenericControllersByDecorators(controller: Class, genericControllers: GenericControllers, nameConversion: (x: string) => string) {
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
    const classes = await findClassRecursive(controller, option)
    const result = []
    for (const cls of classes) {
        const meta = reflect(cls.type)
        // entity marked with generic controller
        if (!!genericControllerRegistry.get(meta.type)) {
            if (!option.genericController)
                throw new Error(errorMessage.GenericControllerRequired)
            const ctl = createGenericControllersByDecorators(cls.type, option.genericController, option.genericControllerNameConversion)
                .map(type => ({ root: cls.root, type }))
            result.push(...ctl)
        }
    }
    return result
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