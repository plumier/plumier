import { HttpStatusError } from "./application"
import { Class } from "./common"
import { ConverterFunction } from "./security"
import { ValidationIssue } from "./validator"


export type TypeConverter = { type: Class, converter: ConverterFunction }
export type DefaultConverter = "Boolean" | "Number" | "Date" | "Object" | "Array"

export type Converters = {
    default: { [key in DefaultConverter]: ConverterFunction },
    converters: Map<Function, ConverterFunction>
}

export class ConversionError extends HttpStatusError {
    constructor(public issues: ValidationIssue) {
        super(400)
        Object.setPrototypeOf(this, ConversionError.prototype)
    }
}