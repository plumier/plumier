import reflect, { CustomPropertyDecorator, TypeOverride } from "@plumier/reflect"



export namespace meta {

    /**
     * Add method, property, parameter with data type information, to be able for reflection library to introspect its datatype. This function is shorthand of `@type()` decorator from `@plumier/reflect`
     * @param type the data type, specify the type by `Type` or `[Type]` for array. To reduce unknown type error use callback `() => Type` or `() => [Type]`
     * @param genericParameters List of generic type parameters
     */
    export function type(type: TypeOverride | ((x: any) => TypeOverride), ...genericParameters: (string | string[])[]) {
        return reflect.type(type, ...genericParameters)
    }

    /**
     * Add property with metadata information to be able for reflection library to introspect its preferences. This function is shorthand of `@noop()` decorator from `@plumier/reflect`
     */
    export function property(): CustomPropertyDecorator {
        return reflect.noop()
    }

    /**
     * Add method with metadata information to be able for reflection library to introspect its preferences. This function is shorthand of `@noop()` decorator from `@plumier/reflect`
     */
    export function method(): MethodDecorator {
        return reflect.noop()
    }

    /**
     * Add class with metadata information that all its constructor parameter is a parameter property. This function is shorthand of `@parameterProperties()` decorator from `@plumier/reflect`
     */
    export function parameterProperties() {
        return reflect.parameterProperties()
    }
}