import {
    api,
    appendRoute,
    AuthorizeDecorator,
    Class,
    DefaultFacility,
    entityHelper,
    findClassRecursive,
    generateRoutes,
    HttpMethod,
    IgnoreDecorator,
    PlumierApplication,
    RelationDecorator,
    route,
    RouteDecorator,
} from "@plumier/core"
import { isAbsolute, join } from "path"
import pluralize from "pluralize"
import reflect, { decorateClass, generic } from "tinspector"

import { ControllerGeneric, OneToManyControllerGeneric, RelationPropertyDecorator } from "./types"

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
    group?: string
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

function copyDecorators(decorators: any[], controller: Class) {
    const result = []
    for (const decorator of decorators) {
        // copy @route.ignore()
        if ((decorator as IgnoreDecorator).name === "plumier-meta:ignore") {
            result.push(decorator)
        }
        // copy @authorize
        const authDec = (decorator as AuthorizeDecorator)
        if (authDec.type === "plumier-meta:authorize") {
            // @authorize.role() should applied to all actions 
            if (authDec.access === "all") {
                result.push(decorator)
                continue
            }
            const meta = reflect(controller)
            const findAction = (...methods: HttpMethod[]) => {
                const result = []
                for (const action of meta.methods) {
                    if (action.decorators.some((x: RouteDecorator) => x.name === "plumier-meta:route"
                        && methods.some(m => m === x.method)))
                        result.push(action.name)
                }
                return result
            }
            // add extra action filter for decorator @authorize.get() and @authorize.set() 
            // get will only applied to actions with GET method 
            // set will only applied to actions with mutation DELETE, PATCH, POST, PUT
            if (authDec.access === "get") {
                authDec.action = findAction("get")
                result.push(decorator)
            }
            if (authDec.access === "set") {
                authDec.action = findAction("delete", "patch", "post", "put")
                result.push(decorator)
            }
        }
    }
    //reflect(ctl, { flushCache: true })
    return result
}

function decorateController(controller: Class, decorators: any[]) {
    for (const decorator of decorators) {
        Reflect.decorate([decorateClass(decorator)], controller)
    }
}

function createController(rootPath: string, entity: Class, controller: Class<ControllerGeneric<any, any>>, nameConversion: (x: string) => string) {
    // get type of ID column on entity
    const idType = entityHelper.getIdType(entity)
    // create controller type dynamically 
    const Controller = generic.create({ parent: controller, name: controller.name }, entity, idType)
    // add root decorator
    const name = nameConversion(entity.name)
    const path = appendRoute(rootPath, name)
    // copy @route.ignore() and @authorize on entity to the controller to control route generation
    const meta = reflect(entity)
    decorateController(Controller, copyDecorators(meta.decorators, controller))
    Reflect.decorate([route.root(path), api.tag(entity.name)], Controller)
    return Controller
}

function createOneToManyController(rootPath: string, entity: Class, relation: Class, relationProperty: string, controller: Class<OneToManyControllerGeneric<any, any, any, any>>, nameConversion: (x: string) => string) {
    // get type of ID column on parent entity
    const parentIdType = entityHelper.getIdType(entity)
    // get type of ID column on entity
    const idType = entityHelper.getIdType(relation)
    // create controller 
    const Controller = generic.create({ parent: controller, name: controller.name }, entity, relation, parentIdType, idType)
    // add root decorator
    const name = nameConversion(entity.name)
    const path = appendRoute(rootPath, `${name}/:pid/${relationProperty}`)
    // copy @route.ignore() on entity to the controller to control route generation
    const meta = reflect(entity)
    const decorators = meta.properties.find(x => x.name === relationProperty)!.decorators
    decorateController(Controller, copyDecorators(decorators, controller))
    Reflect.decorate([
        route.root(path),
        api.tag(entity.name),
        // re-assign oneToMany decorator which will be used on OneToManyController constructor
        decorateClass(<RelationPropertyDecorator>{ kind: "plumier-meta:relation-prop-name", name: relationProperty }),
    ], Controller)
    Reflect.decorate([], Controller)
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
                const relation = prop.decorators.find((x: RelationDecorator) => x.kind === "plumier-meta:relation")
                if (relation && prop.typeClassification === "Array") {
                    controllers.push(createOneToManyController(opt.rootPath, entity, prop.type[0], prop.name, opt.oneToManyController, opt.nameConversion))
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