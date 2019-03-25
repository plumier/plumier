import "@plumier/kernel"
import { Class, ValidationIssue, ValidatorDecorator, ValidatorFunction, ValidatorStore, ValidatorId } from "@plumier/core";
import { decorateProperty, reflect, TypeDecorator } from "tinspector";
import Validator from "validator";
import { Context } from 'koa';


/* ------------------------------------------------------------------------------- */
/* ---------------------------------- TYPES -------------------------------------- */
/* ------------------------------------------------------------------------------- */

export interface Opt { message?: string }
const OptionalDecorator = <ValidatorDecorator>{ type: "ValidatorDecorator", validator: ValidatorId.optional }

/* ------------------------------------------------------------------------------- */
/* ---------------------------------- DECORATORS --------------------------------- */
/* ------------------------------------------------------------------------------- */

export namespace val {
    function validate(validator: (x: string) => boolean, message: string) {
        //log(`[Validator] Name: ${b(name)}`)
        const decorator: ValidatorDecorator = {
            type: "ValidatorDecorator",
            validator: async x => !validator(x) ? message : undefined,
        }
        return decorateProperty(decorator)
    }

    export function after(opt?: Opt & { date?: string }) {
        return validate(x => Validator.isAfter(x, opt && opt.date), opt && opt.message || `Date must after ${opt && opt.date || "today"}`)
    }

    export function alpha(opt?: Opt & { locale?: ValidatorJS.AlphaLocale }) {
        return validate(x => Validator.isAlpha(x, opt && opt.locale), opt && opt.message || "Invalid alpha")
    }

    export function alphanumeric(opt?: Opt & { locale?: ValidatorJS.AlphaLocale }) {
        return validate(x => Validator.isAlphanumeric(x, opt && opt.locale), opt && opt.message || "Invalid alpha numeric")
    }

    export function ascii(opt?: Opt) {
        return validate(x => Validator.isAscii(x), opt && opt.message || "Invalid ascii")
    }

    export function base64(opt?: Opt) {
        return validate(x => Validator.isBase64(x), opt && opt.message || "Invalid base 64")
    }

    export function before(opt?: Opt & { date?: string }) {
        return validate(x => Validator.isBefore(x, opt && opt.date), opt && opt.message || `Date must before ${opt && opt.date || "today"}`)
    }

    export function byteLength(opt: Opt & ValidatorJS.IsByteLengthOptions) {
        return validate(x => Validator.isByteLength(x, opt), opt && opt.message || "Invalid byte length")
    }

    export function creditCard(opt?: Opt) {
        return validate(x => Validator.isCreditCard(x), opt && opt.message || "Invalid credit card number")
    }

    export function currency(opt?: Opt & ValidatorJS.IsCurrencyOptions) {
        return validate(x => Validator.isCurrency(x, opt), opt && opt.message || "Invalid currency")
    }

    export function dataURI(opt?: Opt) {
        return validate(x => Validator.isDataURI(x), opt && opt.message || "Invalid data URI")
    }

    export function decimal(opt?: Opt & ValidatorJS.IsDecimalOptions) {
        return validate(x => Validator.isDecimal(x, opt), opt && opt.message || "Invalid decimal")
    }

    export function divisibleBy(opt: Opt & { num: number }) {
        return validate(x => Validator.isDivisibleBy(x, opt.num), opt && opt.message || `Not divisible by ${opt.num}`)
    }

    export function email(opt?: Opt & ValidatorJS.IsEmailOptions) {
        return validate(x => Validator.isEmail(x, opt), opt && opt.message || "Invalid email address")
    }

    export function fqdn(opt?: Opt & ValidatorJS.IsFQDNOptions) {
        return validate(x => Validator.isFQDN(x, opt), opt && opt.message || "Invalid FQDN")
    }

    export function float(opt?: Opt & ValidatorJS.IsFloatOptions) {
        return validate(x => Validator.isFloat(x, opt), opt && opt.message || "Invalid float number")
    }

    export function fullWidth(opt?: Opt) {
        return validate(x => Validator.isFullWidth(x), opt && opt.message || "Invalid value provided")
    }

    export function halfWidth(opt?: Opt) {
        return validate(x => Validator.isHalfWidth(x), opt && opt.message || "Invalid value provided")
    }

    export function hash(opt: Opt & { algorithm: ValidatorJS.HashAlgorithm }) {
        return validate(x => Validator.isHash(x, opt.algorithm), opt && opt.message || "Invalid hash")
    }

    export function hexColor(opt?: Opt) {
        return validate(x => Validator.isHexColor(x), opt && opt.message || "Invalid hex color")
    }

    export function hexadecimal(opt?: Opt) {
        return validate(x => Validator.isHexadecimal(x), opt && opt.message || "Invalid hexadecimal")
    }

    export function ip(opt?: Opt & { version?: number }) {
        return validate(x => Validator.isIP(x, opt && opt.version), opt && opt.message || "Invalid IP address")
    }

    export function isbn(opt?: Opt & { version?: number }) {
        return validate(x => Validator.isISBN(x, opt && opt.version), opt && opt.message || "Invalid ISBN")
    }

    export function isin(opt?: Opt) {
        return validate(x => Validator.isISIN(x), opt && opt.message || "Invalid ISIN")
    }

    export function iso31661Alpha2(opt?: Opt) {
        return validate(x => Validator.isISO31661Alpha2(x), opt && opt.message || "Invalid ISO 31661 Alpha 2")
    }

    export function iso8601(opt?: Opt) {
        return validate(x => Validator.isISO8601(x), opt && opt.message || "Invalid ISO 8601 date")
    }

    export function isrc(opt?: Opt) {
        return validate(x => Validator.isISRC(x), opt && opt.message || "Invalid ISRC")
    }

    export function issn(opt?: Opt & ValidatorJS.IsISSNOptions) {
        return validate(x => Validator.isISSN(x, opt), opt && opt.message || "Invalid ISSN")
    }

    export function int(opt?: Opt & ValidatorJS.IsIntOptions) {
        return validate(x => Validator.isInt(x, opt), opt && opt.message || "Invalid integer")
    }

    export function json(opt?: Opt) {
        return validate(x => Validator.isJSON(x), opt && opt.message || "Invalid JSON")
    }

    export function latLong(opt?: Opt) {
        return validate(x => Validator.isLatLong(x), opt && opt.message || "Invalid lat long")
    }

    export function length(opt: Opt & ValidatorJS.IsLengthOptions) {
        return validate(x => Validator.isLength(x, opt), opt && opt.message || "Invalid length")
    }

    export function lowerCase(opt?: Opt) {
        return validate(x => Validator.isLowercase(x), opt && opt.message || "Invalid lower case")
    }

    export function macAddress(opt?: Opt) {
        return validate(x => Validator.isMACAddress(x), opt && opt.message || "Invalid MAC address")
    }

    export function matches(opt: Opt & { pattern: string | RegExp, modifier?: string }) {
        return validate(x => Validator.matches(x, opt.pattern, opt.modifier), opt.message || "Invalid string")
    }

    export function md5(opt?: Opt) {
        return validate(x => Validator.isMD5(x), opt && opt.message || "Invalid MD5 hash")
    }

    export function mimeType(opt?: Opt) {
        return validate(x => Validator.isMimeType(x), opt && opt.message || "Invalid mime type")
    }

    export function mobilePhone(opt: Opt & { locale: ValidatorJS.MobilePhoneLocale, options?: ValidatorJS.IsMobilePhoneOptions }) {
        return validate(x => Validator.isMobilePhone(x, opt.locale, opt && opt.options), opt && opt.message || "Invalid mobile phone")
    }

    export function mongoId(opt?: Opt) {
        return validate(x => Validator.isMongoId(x), opt && opt.message || "Invalid MongoDb id")
    }

    export function multibyte(opt?: Opt) {
        return validate(x => Validator.isMultibyte(x), opt && opt.message || "Invalid multi byte")
    }

    export function numeric(opt?: Opt) {
        return validate(x => Validator.isNumeric(x), opt && opt.message || "Invalid numeric")
    }

    export function port(opt?: Opt) {
        return validate(x => Validator.isPort(x), opt && opt.message || "Invalid port")
    }

    export function postalCode(opt: Opt & { locale: ValidatorJS.PostalCodeLocale }) {
        return validate(x => Validator.isPostalCode(x, opt.locale), opt && opt.message || "Invalid postal code")
    }

    export function surrogatePair(opt?: Opt) {
        return validate(x => Validator.isSurrogatePair(x), opt && opt.message || "Invalid surrogate pair")
    }

    export function url(opt?: Opt & ValidatorJS.IsURLOptions) {
        return validate(x => Validator.isURL(x, opt), opt && opt.message || "Invalid url")
    }

    export function UUID(opt?: Opt & { version?: 3 | 4 | 5 | "3" | "4" | "5" | "all" }) {
        return validate(x => Validator.isUUID(x), opt && opt.message || "Invalid UUID")
    }

    export function uppercase(opt?: Opt) {
        return validate(x => Validator.isUppercase(x), opt && opt.message || "Invalid uppercase")
    }

    export function variableWidth(opt?: Opt) {
        return validate(x => Validator.isVariableWidth(x), opt && opt.message || "Invalid variable width")
    }

    export function whiteListed(opt: Opt & { chars: string | string[] }) {
        return validate(x => Validator.isWhitelisted(x, opt && opt.chars), opt && opt.message || "Invalid white listed")
    }

    export function optional() {
        return decorateProperty({ ...OptionalDecorator })
    }

    export function partial(typ: Class) {
        return reflect.type(typ, "Partial")
    }

    export function skip() {
        return custom(ValidatorId.skip)
    }

    export function custom(fn: ValidatorFunction | string) {
        return decorateProperty(<ValidatorDecorator>{
            type: "ValidatorDecorator",
            validator: fn
        })
    }
}

/* ------------------------------------------------------------------------------- */
/* ---------------------------------- HELPERS ------------------------------------ */
/* ------------------------------------------------------------------------------- */

function getType(value: any) {
    return value.constructor as Class
}

/* ------------------------------------------------------------------------------- */
/* ---------------------------------- VALIDATORS --------------------------------- */
/* ------------------------------------------------------------------------------- */

export async function validateArray(value: any[], path: string[], ctx: Context, validators?: ValidatorStore): Promise<ValidationIssue[]> {
    const result = await Promise.all(value.map((x, i) => validate(x, [], path.concat(i.toString()), ctx, validators)))
    return result.flatten()
}

export async function validateObject(value: any, decs: any[], path: string[], ctx: Context, validators?: ValidatorStore): Promise<ValidationIssue[]> {
    const partial = decs.find((x: TypeDecorator): x is TypeDecorator => x.kind === "Override" && x.info === "Partial")
    const partialType = partial && partial.type
    const meta = reflect(partialType || getType(value))
    const promised: Promise<ValidationIssue[]>[] = []
    for (const prop of meta.properties) {
        const decors = prop.decorators.concat(partialType ? OptionalDecorator : [])
        const newPath = path.concat(prop.name)
        const result = validate(value[prop.name], decors, newPath, ctx, validators)
        promised.push(result)
    }
    const result = await Promise.all(promised)
    return result.flatten()
}

export async function validateValue(object: any, decorators: any[], path: string[], ctx: Context, validators: ValidatorStore) {
    if (object === undefined || object === null || object === "") {
        return decorators.some((x: ValidatorDecorator) => x.validator === ValidatorId.optional) ? [] : [{ messages: ["Required"], path }]
    }
    else {
        const value = "" + object
        const promised: Promise<string | undefined>[] = []
        for (let dec of (decorators as ValidatorDecorator[])) {
            if (dec.type === "ValidatorDecorator" && dec.validator !== ValidatorId.optional) {
                const result = typeof dec.validator === "string" ? validators[dec.validator](value, ctx) : dec.validator(value, ctx)
                promised.push(result)
            }
        }
        const result = await Promise.all(promised)
        const messages = result.filter((x): x is string => Boolean(x))
        return messages.length > 0 ? [{ messages, path }] : []
    }
}

export async function validate(object: any, decs: any[], path: string[], ctx: Context, validators: ValidatorStore = {}): Promise<ValidationIssue[]> {
    if (decs.some((x: ValidatorDecorator) => typeof x.validator === "string" && x.validator === ValidatorId.skip)) return []
    if (Array.isArray(object))
        return validateArray(object, path, ctx, validators)
    else if (typeof object === "object" && object !== null && object.constructor !== Date)
        return validateObject(object, decs, path, ctx, validators)
    else
        return validateValue(object, decs, path, ctx, validators)
}

