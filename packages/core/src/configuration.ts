import { Context } from "koa"
import { ParameterReflection } from "tinspector"
import { Converter, ConverterMap } from "typedconverter"

import { DependencyResolver } from "./application"
import { Class } from "./common"
import { Facility } from "./facility"
import { Middleware } from "./middleware"
import { FileParser } from "./multipart"
import { HttpMethod } from "./route-generator"
import { AuthorizeStore } from "./authorization"
import { ValidationIssue, ValidatorFunction, ValidatorStore } from "./validator"


 interface Configuration {
    mode: "debug" | "production"

    /**
     * Specify controller path (absolute or relative to entry point) or the controller classes array.
     */
    controller: string | Class[] | Class

    /**
     * Set custom dependency resolver for dependency injection
     */
    dependencyResolver: DependencyResolver,

    /**
     * Define default response status for method type get/post/put/delete, default 200
    ```
    responseStatus: { post: 201, put: 204, delete: 204 }
    ```
    */
    responseStatus?: Partial<{ [key in HttpMethod]: number }>

    /**
     * Set custom converters for parameter binding
    ```
    converters: [{
        { key: AnimalDto, converter: value => new AnimalDto(value) }
    }]
    ```
     */
    converters?: ConverterMap[],

    /**
     * Set custom validator
     */
    validator?: (value: any, metadata: ParameterReflection, context: Context, validators?: { [key: string]: ValidatorFunction }) => Promise<ValidationIssue[]>

    /**
     * Multi part form file parser implementation
     */
    fileParser?: (ctx: Context) => FileParser,

    /**
     * Key-value pair to store validator logic. Separate decorator and validation logic
     */
    validators?: ValidatorStore

    /**
     * Key-value pair to store authorization logic. Separate decorator and authorization logic
     */
    authorizer?: AuthorizeStore
}

 interface PlumierConfiguration extends Configuration {
    middleware: Middleware[]
    facilities: Facility[]
}



class DefaultDependencyResolver implements DependencyResolver {
    resolve(type: new (...args: any[]) => any) {
        return new type()
    }
}

 const DefaultConfiguration: Configuration = {
    mode: "debug",
    controller: "./controller",
    dependencyResolver: new DefaultDependencyResolver()
}

export {Configuration, DefaultConfiguration, PlumierConfiguration}
