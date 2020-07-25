import {
    api,
    appendRoute,
    Class,
    DefaultFacility,
    findClassRecursive,
    generateRoutes,
    IgnoreDecorator,
    PlumierApplication,
    route,
    AuthorizeDecorator,
} from "@plumier/core"
import reflect, { decorateClass, generic, metadata } from "tinspector"

import { ControllerGeneric, IdentifierDecorator, OneToManyControllerGeneric, OneToManyDecorator } from "./types"
import pluralize from "pluralize"
import { isAbsolute, join } from "path"

interface CreateRouteFromEntitiesOption {
    entities: Class[],
    rootPath?: string,
    controller: Class<ControllerGeneric<any, any>>,
    oneToManyController: Class<OneToManyControllerGeneric<any, any, any, any>>,
    nameConversion: (x: string) => string
}

interface GenericControllerFacilityOption {
    /**
     * Define group of route generated, this will be used to categorized routes in Route Analysis and Swagger (separate swagger endpoint for each group)
     */
    group?:string
    /**
     * Root path of the endpoint generated, for example /api/v1
     */
    rootPath?: string

    /**
     * Custom generic controllers implementations. 
     */
    controller?: string | Class | Class[],

    /**
     * List of entities or directory location of entities
     */
    entities: string | Class | Class[]
}

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //


function getIdType(type: Class): Class {
    const meta = reflect(type)
    for (const prop of meta.properties) {
        const decorator = prop.decorators.find((x: IdentifierDecorator) => x.kind === "GenericDecoratorId")
        if (decorator) return prop.type
    }
    return String
}

function copyDecorators(decorators:any[]) {
    const result = []
    for (const decorator of decorators) {
        if((decorator as IgnoreDecorator).name === "Ignore") {
            result.push(decorator)
        }
        const authDec = (decorator as AuthorizeDecorator)
        if(authDec.type === "plumier-meta:authorize" && authDec.access === "all"){
            result.push(decorator)
        }
    }
    return result
}

function decorateController(controller:Class, decorators:any[]) {
    for (const decorator of decorators) {
        Reflect.decorate([decorateClass(decorator)], controller)
    }
}

function createController(rootPath: string, entity: Class, controller: Class<ControllerGeneric<any, any>>, nameConversion: (x: string) => string) {
    // get type of ID column on entity
    const idType = getIdType(entity)
    // create controller type dynamically 
    const Controller = generic.create({ parent: controller, name: controller.name }, entity, idType)
    // add root decorator
    const name = nameConversion(entity.name)
    const path = appendRoute(rootPath, name)
    // copy @route.ignore() and @authorize on entity to the controller to control route generation
    const meta = reflect(entity)
    decorateController(Controller, copyDecorators(meta.decorators))
    Reflect.decorate([route.root(path)], Controller)
    Reflect.decorate([api.tag(entity.name)], Controller)
    return Controller
}

function createOneToManyController(rootPath: string, dec: OneToManyDecorator, controller: Class<OneToManyControllerGeneric<any, any, any, any>>, nameConversion: (x: string) => string) {
    const decType = metadata.isCallback(dec.type) ? dec.type({}) : dec.type
    const realType = Array.isArray(decType) ? decType[0] : decType
    // get type of ID column on parent entity
    const parentIdType = getIdType(dec.parentType)
    // get type of ID column on entity
    const idType = getIdType(realType)
    // create controller 
    const Controller = generic.create({ parent: controller, name: controller.name }, dec.parentType, realType, parentIdType, idType)
    // add root decorator
    const name = nameConversion(dec.parentType.name)
    const path = appendRoute(rootPath, `${name}/:pid/${dec.propertyName}`)
    // copy @route.ignore() on entity to the controller to control route generation
    const meta = reflect(dec.parentType)
    const decorators = meta.properties.find(x => x.name === dec.propertyName)!.decorators
    decorateController(Controller, copyDecorators(decorators))
    Reflect.decorate([
        route.root(path),
        // re-assign oneToMany decorator which will be used on OneToManyController constructor
        decorateClass(dec)],
        Controller)
    Reflect.decorate([api.tag(dec.parentType.name)], Controller)
    return Controller
}

// --------------------------------------------------------------------- //
// ------------------------------ FACILITY ----------------------------- //
// --------------------------------------------------------------------- //

abstract class GenericControllerFacility extends DefaultFacility {
    protected abstract defaultController: Class<ControllerGeneric<any, any>>
    protected abstract defaultOneToManyController: Class<OneToManyControllerGeneric<any, any, any, any>>

    constructor(protected option: GenericControllerFacilityOption) {
        super()
    }

    protected abstract getEntities(entities: string | Class | Class[]): Class[]

    protected createRoutesFromEntities(opt: Required<CreateRouteFromEntitiesOption>) {
        const controllers = []
        for (const entity of opt.entities) {
            controllers.push(createController(opt.rootPath, entity, opt.controller, opt.nameConversion))
            const meta = reflect(entity)
            for (const prop of meta.properties) {
                const oneToMany = prop.decorators.find((x: OneToManyDecorator): x is OneToManyDecorator => x.kind === "GenericDecoratorOneToMany")
                if (oneToMany) {
                    controllers.push(createOneToManyController(opt.rootPath, { ...oneToMany, propertyName: prop.name }, opt.oneToManyController, opt.nameConversion))
                }
            }
        }
        return generateRoutes(controllers, { group: this.option.group, overridable: true })
    }

    protected getControllers(controller: string | Class | Class[]): Class[] {
        if (typeof controller === "function") {
            if (controller.name.search(/generic$/i) === -1) return []
            if (controller.prototype instanceof ControllerGeneric) return [controller]
            if (controller.prototype instanceof OneToManyControllerGeneric) return [controller]
            return []
        }
        else if (Array.isArray(controller)) {
            const result = []
            for (const ctl of controller) {
                result.push(...this.getControllers(ctl))
            }
            return result
        }
        else {
            const controllers = findClassRecursive(controller, x => true).map(x => x.type)
            return this.getControllers(controllers)
        }
    }

    fixPath(opt: string | Class | Class[], rootDir: string) {
        return typeof opt === "string" ? isAbsolute(opt) ? opt
            : join(rootDir, opt) : opt
    }

    async generateRoutes(app: Readonly<PlumierApplication>) {
        const fixedCtlLocation = this.fixPath(this.option.controller ?? app.config.controller, app.config.rootDir)
        const controllers = this.getControllers(fixedCtlLocation)
        const controller = controllers.find(x => x.name.search(/generic$/i) > -1 && x.prototype instanceof ControllerGeneric)
        const controllerOneToMany = controllers.find(x => x.name.search(/generic$/i) > -1 && x.prototype instanceof OneToManyControllerGeneric)
        return this.createRoutesFromEntities({
            
            rootPath: this.option.rootPath ?? "",
            controller: controller ?? this.defaultController,
            oneToManyController: controllerOneToMany ?? this.defaultOneToManyController,
            entities: this.getEntities(this.fixPath(this.option.entities, app.config.rootDir)),
            nameConversion: x => pluralize(x)
        })
    }
}

export { GenericControllerFacility, GenericControllerFacilityOption }