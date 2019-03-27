import { Context } from "koa"
import reflect, { ParameterReflection } from "tinspector"

import { Class } from "./common"
import { TypeConverter } from "./converter"
import { Facility } from "./facility"
import { Middleware } from "./middleware"
import { FileParser } from "./multipart"
import { HttpMethod } from "./route-generator"
import { AuthorizeStore } from "./security"
import { ValidationIssue, ValidatorFunction, ValidatorStore } from "./validator"
import { DependencyResolver, DefaultDependencyResolver } from './application';



export interface Configuration {
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
    converters: {
        AnimalDto: (value:any, type:Function) => new AnimalDto(value)
    }
    ```
     */
    converters?: TypeConverter[],

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

export interface PlumierConfiguration extends Configuration {
    middleware: Middleware[]
    facilities: Facility[]
}

export const DefaultConfiguration: Configuration = {
    mode: "debug",
    controller: "./controller",
    dependencyResolver: new DefaultDependencyResolver()
}

