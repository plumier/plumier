import { decorateParameter, reflect } from "tinspector";
import Validator from "validator";
import Debug from "debug"
import { inspect } from 'util';
import Chalk from 'chalk'

const log = Debug("validatorts")

/* ------------------------------------------------------------------------------- */
/* ---------------------------------- TYPES -------------------------------------- */
/* ------------------------------------------------------------------------------- */

export type Class = new (...args: any[]) => any
export type ValidatorFunction = (value: string) => string | undefined

export interface ValidationResult {
    value: string
    path: string[]
    messages: string[]
}

export interface ValidatorDecorator {
    type: "ValidatorDecorator",
    validator: ValidatorFunction
}

export interface Opt { message?: string }

/* ------------------------------------------------------------------------------- */
/* ---------------------------------- HELPERS ------------------------------------ */
/* ------------------------------------------------------------------------------- */

function b(value: any) {
    if (typeof value === "object") {
        return Chalk.blue(inspect(value))
    }
    return Chalk.blue(value)
}

function getType(value: any) {
    return value.constructor as Class
}

/* ------------------------------------------------------------------------------- */
/* ---------------------------------- DECORATORS --------------------------------- */
/* ------------------------------------------------------------------------------- */

export namespace val {
    function validate(validator: (x: string) => boolean, message: string) {
        const decorator: ValidatorDecorator = {
            type: "ValidatorDecorator",
            validator: x => !validator(x) ? message : undefined
        }
        return decorateParameter(decorator)
    }

    export function after(opt?: Opt & { date?: string }) {
        return validate(x => Validator.isAfter(x, opt && opt.date), opt && opt.message || "Invalid value provided")
    }

    export function alpha(opt?: Opt & { locale?: ValidatorJS.AlphaLocale }) {
        return validate(x => Validator.isAlpha(x, opt && opt.locale), opt && opt.message || "Invalid value provided")
    }

    export function alphanumeric(opt?: Opt & { locale?: ValidatorJS.AlphaLocale }) {
        return validate(x => Validator.isAlphanumeric(x, opt && opt.locale), opt && opt.message || "Invalid value provided")
    }

    export function ascii(opt?: Opt) {
        return validate(x => Validator.isAscii(x), opt && opt.message || "Invalid value provided")
    }

    export function base64(opt?: Opt) {
        return validate(x => Validator.isBase64(x), opt && opt.message || "Invalid value provided")
    }

    export function before(opt?: Opt & { date?: string }) {
        return validate(x => Validator.isBefore(x, opt && opt.date), opt && opt.message || "Invalid value provided")
    }

    export function boolean(opt?: Opt) {
        return validate(x => Validator.isBoolean(x), opt && opt.message || "Invalid value provided")
    }

    export function byteLength(opt: Opt & { options: ValidatorJS.IsByteLengthOptions }) {
        return validate(x => Validator.isByteLength(x, opt.options), opt && opt.message || "Invalid value provided")
    }

    export function creditCard(opt?: Opt) {
        return validate(x => Validator.isCreditCard(x), opt && opt.message || "Invalid value provided")
    }

    export function currency(opt?: Opt & { options?: ValidatorJS.IsCurrencyOptions }) {
        return validate(x => Validator.isCurrency(x, opt && opt.options), opt && opt.message || "Invalid value provided")
    }

    export function dataURI(opt?: Opt) {
        return validate(x => Validator.isDataURI(x), opt && opt.message || "Invalid value provided")
    }

    export function decimal(opt?: Opt & { options?: ValidatorJS.IsDecimalOptions }) {
        return validate(x => Validator.isDecimal(x, opt && opt.options), opt && opt.message || "Invalid value provided")
    }

    export function divisibleBy(opt: Opt & { num: number }) {
        return validate(x => Validator.isDivisibleBy(x, opt.num), opt && opt.message || "Invalid value provided")
    }

    export function email(opt?: Opt & { options?: ValidatorJS.IsEmailOptions }) {
        return validate(x => Validator.isEmail(x, opt && opt.options), opt && opt.message || "Invalid value provided")
    }

    export function empty(opt?: Opt) {
        return validate(x => Validator.isEmpty(x), opt && opt.message || "Invalid value provided")
    }

    export function fQDN(opt?: Opt & { options?: ValidatorJS.IsFQDNOptions }) {
        return validate(x => Validator.isFQDN(x, opt && opt.options), opt && opt.message || "Invalid value provided")
    }

    export function float(opt?: Opt & { options?: ValidatorJS.IsFloatOptions }) {
        return validate(x => Validator.isFloat(x, opt && opt.options), opt && opt.message || "Invalid value provided")
    }

    export function fullWidth(opt?: Opt) {
        return validate(x => Validator.isFullWidth(x), opt && opt.message || "Invalid value provided")
    }

    export function halfWidth(opt?: Opt) {
        return validate(x => Validator.isHalfWidth(x), opt && opt.message || "Invalid value provided")
    }

    export function hash(opt: Opt & { algorithm: ValidatorJS.HashAlgorithm }) {
        return validate(x => Validator.isHash(x, opt.algorithm), opt && opt.message || "Invalid value provided")
    }

    export function hexColor(opt?: Opt) {
        return validate(x => Validator.isHexColor(x), opt && opt.message || "Invalid value provided")
    }

    export function hexadecimal(opt?: Opt) {
        return validate(x => Validator.isHexadecimal(x), opt && opt.message || "Invalid value provided")
    }

    export function ip(opt?: Opt & { version?: number }) {
        return validate(x => Validator.isIP(x, opt && opt.version), opt && opt.message || "Invalid value provided")
    }

    export function isbn(opt?: Opt & { version?: number }) {
        return validate(x => Validator.isISBN(x, opt && opt.version), opt && opt.message || "Invalid value provided")
    }

    export function isin(opt?: Opt) {
        return validate(x => Validator.isISIN(x), opt && opt.message || "Invalid value provided")
    }

    export function iso31661Alpha2(opt?: Opt) {
        return validate(x => Validator.isISO31661Alpha2(x), opt && opt.message || "Invalid value provided")
    }

    export function iso8601(opt?: Opt) {
        return validate(x => Validator.isISO8601(x), opt && opt.message || "Invalid value provided")
    }

    export function isrc(opt?: Opt) {
        return validate(x => Validator.isISRC(x), opt && opt.message || "Invalid value provided")
    }

    export function issn(opt?: Opt & { options?: ValidatorJS.IsISSNOptions }) {
        return validate(x => Validator.isISSN(x, opt && opt.options), opt && opt.message || "Invalid value provided")
    }

    export function int(opt?: Opt & { options?: ValidatorJS.IsIntOptions }) {
        return validate(x => Validator.isInt(x, opt && opt.options), opt && opt.message || "Invalid value provided")
    }

    export function json(opt?: Opt) {
        return validate(x => Validator.isJSON(x), opt && opt.message || "Invalid value provided")
    }

    export function latLong(opt?: Opt) {
        return validate(x => Validator.isLatLong(x), opt && opt.message || "Invalid value provided")
    }

    export function length(opt: Opt & { options: ValidatorJS.IsLengthOptions }) {
        return validate(x => Validator.isLength(x, opt && opt.options), opt && opt.message || "Invalid value provided")
    }

    export function lowerCase(opt?: Opt) {
        return validate(x => Validator.isLowercase(x), opt && opt.message || "Invalid value provided")
    }

    export function macAddress(opt?: Opt) {
        return validate(x => Validator.isMACAddress(x), opt && opt.message || "Invalid value provided")
    }

    export function md5(opt?: Opt) {
        return validate(x => Validator.isMD5(x), opt && opt.message || "Invalid value provided")
    }

    export function mimeType(opt?: Opt) {
        return validate(x => Validator.isMimeType(x), opt && opt.message || "Invalid value provided")
    }

    export function mobilePhone(opt: Opt & { locale: ValidatorJS.MobilePhoneLocale, options?: ValidatorJS.IsMobilePhoneOptions }) {
        return validate(x => Validator.isMobilePhone(x, opt.locale, opt && opt.options), opt && opt.message || "Invalid value provided")
    }

    export function mongoId(opt?: Opt) {
        return validate(x => Validator.isMongoId(x), opt && opt.message || "Invalid value provided")
    }

    export function multibyte(opt?: Opt) {
        return validate(x => Validator.isMultibyte(x), opt && opt.message || "Invalid value provided")
    }

    export function numeric(opt?: Opt) {
        return validate(x => Validator.isNumeric(x), opt && opt.message || "Invalid value provided")
    }

    export function port(opt?: Opt) {
        return validate(x => Validator.isPort(x), opt && opt.message || "Invalid value provided")
    }

    export function postalCode(opt: Opt & { locale: ValidatorJS.PostalCodeLocale }) {
        return validate(x => Validator.isPostalCode(x, opt && opt.locale), opt && opt.message || "Invalid value provided")
    }

    export function surrogatePair(opt?: Opt) {
        return validate(x => Validator.isSurrogatePair(x), opt && opt.message || "Invalid value provided")
    }

    export function url(opt?: Opt & { options?: ValidatorJS.IsURLOptions }) {
        return validate(x => Validator.isURL(x, opt && opt.options), opt && opt.message || "Invalid value provided")
    }

    export function UUID(opt?: Opt & { version?: 3 | 4 | 5 | "3" | "4" | "5" | "all" }) {
        return validate(x => Validator.isUUID(x), opt && opt.message || "Invalid value provided")
    }

    export function uppercase(opt?: Opt) {
        return validate(x => Validator.isUppercase(x), opt && opt.message || "Invalid value provided")
    }

    export function variableWidth(opt?: Opt) {
        return validate(x => Validator.isVariableWidth(x), opt && opt.message || "Invalid value provided")
    }

    export function whiteListed(opt: Opt & { chars: string | string[] }) {
        return validate(x => Validator.isWhitelisted(x, opt && opt.chars), opt && opt.message || "Invalid value provided")
    }

}

/* ------------------------------------------------------------------------------- */
/* ---------------------------------- VALIDATORS --------------------------------- */
/* ------------------------------------------------------------------------------- */

export function validateArray(value: any[], path: string[]): ValidationResult[] {
    return value.map((x, i) => validate(x, [], path.concat(i.toString())))
        .reduce((a, b) => a.concat(b), [])
}


export function validateObject(value: any, path?: string[]): ValidationResult[] {
    const meta = reflect(getType(value))
    return meta.ctorParameters.map(p => validate(value[p.name], p.decorators, (path || []).concat(p.name)))
        .reduce((a, b) => a.concat(b), [])
}

export function validate(object: any, decorators: ValidatorDecorator[], path: string[]): ValidationResult[] {
    if (Array.isArray(object))
        return validateArray(object, path)
    else if (typeof object === "object")
        return validateObject(object, path)
    else {
        const value = "" + object
        const messages = decorators.map(x => x.validator(value))
            .filter((x): x is string => Boolean(x))
        log(`[Value Validator] Value: ${b(value)} Decorators: ${b(decorators)} Path: ${b(path)}`)
        log(`[Value Validator] Validation Result: ${b(messages)}`)
        return messages.length > 0 ? [{ messages, path, value }] : []
    }

}