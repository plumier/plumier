
/* ---------------------------------------------------------------- */
/* --------------------------- TYPES ------------------------------ */
/* ---------------------------------------------------------------- */

import { CustomTypeDefinition } from "./helpers"

export const DecoratorOptionId = Symbol("tinspector:decoratorOption")
export const DecoratorId = Symbol("tinspector:decoratorId")

export type Class<T = any> = new (...arg: any[]) => T
export type TypeOverride = string | string[] | Class | Class[] | CustomTypeDefinition | CustomTypeDefinition[]
export type DecoratorIterator = (type: DecoratorTargetType, target: string, index?: number) => any[]
export type DecoratorTargetType = "Method" | "Class" | "Parameter" | "Property"
export interface NativeDecorator {
    targetType: DecoratorTargetType,
    target: string,
    value: any,
    inherit: boolean,
    allowMultiple: boolean,
    applyTo: string | string[],
    removeApplied: boolean
}
export interface NativeParameterDecorator extends NativeDecorator {
    targetType: "Parameter",
    targetIndex: number
}
export interface TypeOverrideOption {
    genericType: TypeOverride[]
}

export type Reflection = ParameterReflection | FunctionReflection | PropertyReflection | MethodReflection | ClassReflection | ObjectReflection | ConstructorReflection

export interface ReflectionBase {
    kind: string,
    name: string
}
export interface ParameterReflection extends ReflectionBase {
    kind: "Parameter",
    fields: string | { [key: string]: string[] },
    decorators: any[],
    type?: any,
    typeClassification?: "Class" | "Array" | "Primitive"
    index: number
}
export interface PropertyReflection extends ReflectionBase {
    kind: "Property",
    decorators: any[],
    type?: any,
    get?: any,
    set?: any,
    typeClassification?: "Class" | "Array" | "Primitive"
}
export interface ParameterPropertyReflection extends PropertyReflection {
    index: number,
    isParameter: boolean
}
export interface MethodReflection extends ReflectionBase {
    kind: "Method",
    parameters: ParameterReflection[],
    returnType: any,
    decorators: any[],
    typeClassification?: "Class" | "Array" | "Primitive"
}
export interface ConstructorReflection extends ReflectionBase {
    kind: "Constructor",
    parameters: ParameterReflection[],
}
export interface FunctionReflection extends ReflectionBase {
    kind: "Function",
    parameters: ParameterReflection[],
    returnType: any
}
export interface ClassReflection extends ReflectionBase {
    kind: "Class",
    ctor: ConstructorReflection,
    methods: MethodReflection[],
    properties: PropertyReflection[],
    decorators: any[],
    removedDecorators?:any[]
    type: Class,
    super: Class,
    typeClassification?: "Class" | "Array" | "Primitive",
}
export interface ObjectReflection extends ReflectionBase {
    kind: "Object",
    members: Reflection[]
}
export interface NoopDecorator {
    kind: "Noop",
    target: Class
}
export interface TypeDecorator {
    kind: "Override",
    type: TypeOverride | ((x: any) => TypeOverride),
    genericParams: (string|string[])[]
    target: Class
}
export interface PrivateDecorator {
    kind: "Ignore"
}
export interface ParameterPropertiesDecorator {
    type: "ParameterProperties"
}
export interface GenericTypeDecorator {
    kind: "GenericType",
    types: (TypeOverride)[]
    target: Class
}
export interface GenericTemplateDecorator {
    kind: "GenericTemplate",
    templates: (string|string[])[]
    target: Class
}
export interface DecoratorOption {
    /**
     * If `false` decorator will not be merged on the derived class. Default `true` 
     */
    inherit?: boolean,
    /**
     * If `false` throw error when multiple decorator applied on class. Also when set `false` will prevent super class decorator being merged into derived class when already exists. When set `false`, decorator required to have `DecoratorId` property to identify the similar decorator
     */
    allowMultiple?: boolean,

    /**
     * Apply decorator into the specified properties or methods
     */
    applyTo?: string | string[]

    /**
     * Remove applied decorator using `applyTo` on the class scope. Default `true`
     */
    removeApplied?:boolean
}

export type CustomPropertyDecorator = (target: Object, propertyKey: string | symbol, ...index: any[]) => void;

export const DECORATOR_KEY = "plumier.key:DECORATOR"
export const DESIGN_TYPE = "design:type"
export const DESIGN_PARAMETER_TYPE = "design:paramtypes"
export const DESIGN_RETURN_TYPE = "design:returntype"