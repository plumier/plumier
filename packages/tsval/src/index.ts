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
    validator: ValidatorFunction,
    name: string
}

export interface Opt { message?: string }

/* ------------------------------------------------------------------------------- */
/* ---------------------------------- DECORATORS --------------------------------- */
/* ------------------------------------------------------------------------------- */

export namespace val {
    function validate(validator: (x: string) => boolean, message: string, name: string) {
        //log(`[Validator] Name: ${b(name)}`)
        const decorator: ValidatorDecorator = {
            type: "ValidatorDecorator",
            validator: x => !validator(x) ? message : undefined,
            name
        }
        return decorateParameter(decorator)
    }

    export function after(opt?: Opt & { date?: string }) {
        return validate(x => Validator.isAfter(x, opt && opt.date), opt && opt.message || `Date must after ${opt && opt.date}`, "after")
    }

    export function alpha(opt?: Opt & { locale?: ValidatorJS.AlphaLocale }) {
        return validate(x => Validator.isAlpha(x, opt && opt.locale), opt && opt.message || "Invalid alpha", "alpha")
    }

    export function alphanumeric(opt?: Opt & { locale?: ValidatorJS.AlphaLocale }) {
        return validate(x => Validator.isAlphanumeric(x, opt && opt.locale), opt && opt.message || "Invalid alpha numeric", "alphanumeric")
    }

    export function ascii(opt?: Opt) {
        return validate(x => Validator.isAscii(x), opt && opt.message || "Invalid ascii", "ascii")
    }

    export function base64(opt?: Opt) {
        return validate(x => Validator.isBase64(x), opt && opt.message || "Invalid base 64", "base64")
    }

    export function before(opt?: Opt & { date?: string }) {
        return validate(x => Validator.isBefore(x, opt && opt.date), opt && opt.message || `Date must before ${opt && opt.date}`, "before")
    }

    // export function boolean(opt?: Opt) {
    //     return validate(x => Validator.isBoolean(x), opt && opt.message || "Invalid boolean", "boolean")
    // }

    export function byteLength(opt: Opt & ValidatorJS.IsByteLengthOptions) {
        return validate(x => Validator.isByteLength(x, opt), opt && opt.message || "Invalid byte length", "byteLength")
    }

    export function creditCard(opt?: Opt) {
        return validate(x => Validator.isCreditCard(x), opt && opt.message || "Invalid credit card number", "creditCard")
    }

    export function currency(opt?: Opt & ValidatorJS.IsCurrencyOptions) {
        return validate(x => Validator.isCurrency(x, opt), opt && opt.message || "Invalid currency", "currency")
    }

    export function dataURI(opt?: Opt) {
        return validate(x => Validator.isDataURI(x), opt && opt.message || "Invalid data URI", "dataURI")
    }

    export function decimal(opt?: Opt & ValidatorJS.IsDecimalOptions) {
        return validate(x => Validator.isDecimal(x, opt), opt && opt.message || "Invalid decimal", "decimal")
    }

    export function divisibleBy(opt: Opt & { num: number }) {
        return validate(x => Validator.isDivisibleBy(x, opt.num), opt && opt.message || `Not divisible by ${opt.num}`, "divisibleBy")
    }

    export function email(opt?: Opt & ValidatorJS.IsEmailOptions) {
        return validate(x => Validator.isEmail(x, opt), opt && opt.message || "Invalid email address", "email")
    }

    // export function empty(opt?: Opt) {
    //     return validate(x => Validator.isEmpty(x), opt && opt.message || "Not empty", "empty")
    // }

    export function fqdn(opt?: Opt & ValidatorJS.IsFQDNOptions) {
        return validate(x => Validator.isFQDN(x, opt), opt && opt.message || "Invalid FQDN", "fQDN")
    }

    export function float(opt?: Opt & ValidatorJS.IsFloatOptions) {
        return validate(x => Validator.isFloat(x, opt), opt && opt.message || "Invalid float number", "float")
    }

    export function fullWidth(opt?: Opt) {
        return validate(x => Validator.isFullWidth(x), opt && opt.message || "Invalid value provided", "fullWidth")
    }

    export function halfWidth(opt?: Opt) {
        return validate(x => Validator.isHalfWidth(x), opt && opt.message || "Invalid value provided", "halfWidth")
    }

    export function hash(opt: Opt & { algorithm: ValidatorJS.HashAlgorithm }) {
        return validate(x => Validator.isHash(x, opt.algorithm), opt && opt.message || "Invalid hash", "hash")
    }

    export function hexColor(opt?: Opt) {
        return validate(x => Validator.isHexColor(x), opt && opt.message || "Invalid hex color", "hexColor")
    }

    export function hexadecimal(opt?: Opt) {
        return validate(x => Validator.isHexadecimal(x), opt && opt.message || "Invalid hexadecimal", "hexadecimal")
    }

    export function ip(opt?: Opt & { version?: number }) {
        return validate(x => Validator.isIP(x, opt && opt.version), opt && opt.message || "Invalid IP address", "ip")
    }

    export function isbn(opt?: Opt & { version?: number }) {
        return validate(x => Validator.isISBN(x, opt && opt.version), opt && opt.message || "Invalid ISBN", "isbn")
    }

    export function isin(opt?: Opt) {
        return validate(x => Validator.isISIN(x), opt && opt.message || "Invalid ISIN", "isin")
    }

    export function iso31661Alpha2(opt?: Opt) {
        return validate(x => Validator.isISO31661Alpha2(x), opt && opt.message || "Invalid ISO 31661 Alpha 2", "iso31661Alpha2")
    }

    export function iso8601(opt?: Opt) {
        return validate(x => Validator.isISO8601(x), opt && opt.message || "Invalid ISO 8601 date", "iso8601")
    }

    export function isrc(opt?: Opt) {
        return validate(x => Validator.isISRC(x), opt && opt.message || "Invalid ISRC", "isrc")
    }

    export function issn(opt?: Opt & ValidatorJS.IsISSNOptions) {
        return validate(x => Validator.isISSN(x, opt), opt && opt.message || "Invalid ISSN", "issn")
    }

    export function int(opt?: Opt & ValidatorJS.IsIntOptions) {
        return validate(x => Validator.isInt(x, opt), opt && opt.message || "Invalid integer", "int")
    }

    export function json(opt?: Opt) {
        return validate(x => Validator.isJSON(x), opt && opt.message || "Invalid JSON", "json")
    }

    export function latLong(opt?: Opt) {
        return validate(x => Validator.isLatLong(x), opt && opt.message || "Invalid lat long", "latLong")
    }

    export function length(opt: Opt & ValidatorJS.IsLengthOptions) {
        return validate(x => Validator.isLength(x, opt), opt && opt.message || "Invalid length", "length")
    }

    export function lowerCase(opt?: Opt) {
        return validate(x => Validator.isLowercase(x), opt && opt.message || "Invalid lower case", "lowerCase")
    }

    export function macAddress(opt?: Opt) {
        return validate(x => Validator.isMACAddress(x), opt && opt.message || "Invalid MAC address", "macAddress")
    }

    export function md5(opt?: Opt) {
        return validate(x => Validator.isMD5(x), opt && opt.message || "Invalid MD5 hash", "md5")
    }

    export function mimeType(opt?: Opt) {
        return validate(x => Validator.isMimeType(x), opt && opt.message || "Invalid mime type", "mimeType")
    }

    export function mobilePhone(opt: Opt & { locale: ValidatorJS.MobilePhoneLocale, options?: ValidatorJS.IsMobilePhoneOptions }) {
        return validate(x => Validator.isMobilePhone(x, opt.locale, opt && opt.options), opt && opt.message || "Invalid mobile phone", "mobilePhone")
    }

    export function mongoId(opt?: Opt) {
        return validate(x => Validator.isMongoId(x), opt && opt.message || "Invalid MongoDb id", "mongoId")
    }

    export function multibyte(opt?: Opt) {
        return validate(x => Validator.isMultibyte(x), opt && opt.message || "Invalid multi byte", "multibyte")
    }

    export function numeric(opt?: Opt) {
        return validate(x => Validator.isNumeric(x), opt && opt.message || "Invalid numeric", "numeric")
    }

    export function port(opt?: Opt) {
        return validate(x => Validator.isPort(x), opt && opt.message || "Invalid port", "port")
    }

    export function postalCode(opt: Opt & { locale: ValidatorJS.PostalCodeLocale }) {
        return validate(x => Validator.isPostalCode(x, opt.locale), opt && opt.message || "Invalid postal code", "postalCode")
    }

    export function required(opt?: Opt) {
        return validate(x => x !== undefined && x !== null && x !== "", opt && opt.message || "Required", "required")
    }

    export function surrogatePair(opt?: Opt) {
        return validate(x => Validator.isSurrogatePair(x), opt && opt.message || "Invalid surrogate pair", "surrogatePair")
    }

    export function url(opt?: Opt & ValidatorJS.IsURLOptions) {
        return validate(x => Validator.isURL(x, opt), opt && opt.message || "Invalid url", "url")
    }

    export function UUID(opt?: Opt & { version?: 3 | 4 | 5 | "3" | "4" | "5" | "all" }) {
        return validate(x => Validator.isUUID(x), opt && opt.message || "Invalid UUID", "UUID")
    }

    export function uppercase(opt?: Opt) {
        return validate(x => Validator.isUppercase(x), opt && opt.message || "Invalid uppercase", "uppercase")
    }

    export function variableWidth(opt?: Opt) {
        return validate(x => Validator.isVariableWidth(x), opt && opt.message || "Invalid variable width", "variableWidth")
    }

    export function whiteListed(opt: Opt & { chars: string | string[] }) {
        return validate(x => Validator.isWhitelisted(x, opt && opt.chars), opt && opt.message || "Invalid white listed", "whiteListed")
    }

}

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
/* ---------------------------------- VALIDATORS --------------------------------- */
/* ------------------------------------------------------------------------------- */

export function validateArray(value: any[], path: string[]): ValidationResult[] {
    log(`[Array Validator] Value ${b(value)} Path${b(path)}`)
    return value.map((x, i) => validate(x, [], path.concat(i.toString())))
        .reduce((a, b) => a.concat(b), [])
}

export function validateObject(value: any, path?: string[]): ValidationResult[] {
    log(`[Object Validator] Type ${b(value.constructor.name)} Value ${b(value)} Path${b(path || [])}`)
    const meta = reflect(getType(value))
    return meta.ctorParameters.map(p => validate(value[p.name], p.decorators, (path || []).concat(p.name)))
        .reduce((a, b) => a.concat(b), [])
}

export function validate(object: any, decorators: ValidatorDecorator[], path: string[]): ValidationResult[] {
    const empty = () => (object === undefined || object === null || object === "")
    if (Array.isArray(object))
        return validateArray(object, path)
    else if (typeof object === "object" && object !== null)
        return validateObject(object, path)
    else {
        //empty value should be ignored except it is required
        if (empty() && decorators.some(x => x.name == "required")) {
            const messages = decorators.filter(x => x.name == "required").map(x => x.validator(object))
                .filter((x): x is string => Boolean(x))
            return [{ messages, path, value: object }]
        }
        else if (empty()) return []
        else {
            const value = "" + object
            const messages = decorators.map(x => x.validator(value))
                .filter((x): x is string => Boolean(x))
            log(`[Value Validator] Value: ${b(value)} Decorators: ${b(decorators)} Path: ${b(path)}`)
            log(`[Value Validator] Validation Result: ${b(messages)}`)
            return messages.length > 0 ? [{ messages, path, value }] : []
        }
    }
}