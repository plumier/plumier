import reflect, { ParameterReflection } from 'tinspector';
import { Class } from './common';
import { HttpMethod } from './route-generator';
import { TypeConverter } from './converter';
import { ValidatorFunction, ValidationIssue, ValidatorStore } from './validator';
import { FileParser } from './multipart';
import { AuthorizeStore } from './security';
import { Middleware } from "./middleware"
import { Facility } from './facility';
import { Context } from "koa"

export function domain() { return reflect.parameterProperties() }


export interface DependencyResolver {
    resolve(type: (new (...args: any[]) => any)): any
}


export class DefaultDependencyResolver implements DependencyResolver {
    resolve(type: new (...args: any[]) => any) {
        return new type()
    }
}


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

