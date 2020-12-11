import reflect, { decorateProperty, decorate, mergeDecorator, TypeOverride } from "@plumier/reflect";
import { VisitorInvocation } from './invocation';
import { Result } from './visitor';
import { Class } from './types';
import { safeToString } from './converter';

const RequiredValidator = Symbol("tc:required")
const PartialValidator = Symbol("tc:partial")
type Validator = (val: any) => string | undefined
interface ValidatorDecorator { type: "tc:validator", validator: Validator | string | symbol }

// --------------------------------------------------------------------- //
// ----------------------------- DECORATORS ---------------------------- //
// --------------------------------------------------------------------- //

function createValidation(validator: Validator | string | symbol) {
    return decorateProperty(<ValidatorDecorator>{ type: "tc:validator", validator })
}

function required() {
    return createValidation(RequiredValidator)
}

function partial(type: TypeOverride | ((x: any) => TypeOverride)) {
    return mergeDecorator(reflect.type(type), createValidation(PartialValidator))
}

// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //

function isPartial(i: VisitorInvocation) {
    return i.parent && i.parent.decorators.find((x: ValidatorDecorator) => x.validator === PartialValidator)
}

function isEmpty(result: Result) {
    return (result.value === "" || result.value === undefined || result.value === null)
}

// --------------------------------------------------------------------- //
// ------------------------------ VISITORS ----------------------------- //
// --------------------------------------------------------------------- //

function getValidators(i: VisitorInvocation): ValidatorDecorator[] {
    return i.decorators
        .filter((x: ValidatorDecorator) => x.validator !== PartialValidator && x.type === "tc:validator")
}

function validatorVisitor(i: VisitorInvocation): Result {
    const validators = getValidators(i)
    const result = i.proceed()
    if (!isPartial(i) && isEmpty(result) && validators.some(x => x.validator === RequiredValidator))
        return Result.error(i.value, i.path, "Required")
    if (isEmpty(result) || validators.length === 0) return result
    else {
        const messages: string[] = []
        for (const validator of validators) {
            if (typeof validator.validator === "function") {
                const msg = validator.validator(safeToString(i.value))
                if (msg) messages.push(msg)
            }
        }
        return messages.length > 0 ? Result.error(i.value, i.path, messages) : result
    }
}

export {
    createValidation, required, partial,
    validatorVisitor, Validator, ValidatorDecorator,
    PartialValidator, RequiredValidator
}
