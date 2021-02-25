import { route } from "@plumier/core"
import { decorate } from "@plumier/reflect"

import { ControllerBuilder } from "./configuration"
import { updateGenericControllerRegistry } from "./factory"



interface GenericControllerDecorator {
    name: "plumier-meta:controller"
    config: ((x: ControllerBuilder) => void) | undefined
}

function genericController(opt?: string | ((x: ControllerBuilder) => void)) {
    const config = typeof opt === "string" ? (x: ControllerBuilder) => x.setPath(opt) : opt
    return decorate((...args: any[]) => {
        updateGenericControllerRegistry(args[0])
        return <GenericControllerDecorator>{ name: "plumier-meta:controller", config }
    })
}

export { GenericControllerDecorator, genericController }
