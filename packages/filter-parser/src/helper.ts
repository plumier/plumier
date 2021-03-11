import { Class, generic } from "@plumier/reflect"


const ParserAst = Symbol()

function getDecoratorType(controller: Class, expType: string | Class) {
    // extract generic type from controller if string type provided
    return typeof expType === "string" ? generic.getGenericType(controller, expType) as Class : expType
}


export { getDecoratorType, ParserAst }