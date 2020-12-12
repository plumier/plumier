import { TypeOverride } from "@plumier/reflect"
import validatorJs from "validator"

import * as v from "./validation"

interface Opt { message?: string }

namespace val {
    function check(validator: (x: string) => boolean, message: string) {
        return v.createValidation(x => !validator(x) ? message : undefined)
    }

    export function after(opt?: Opt & { date?: string }) {
        return check(x => validatorJs.isAfter(x, opt && opt.date), opt && opt.message || `Date must be greater than ${opt && opt.date || "today"}`)
    }

    export function alpha(opt?: Opt & { locale?: validatorJs.AlphaLocale }) {
        return check(x => validatorJs.isAlpha(x, opt && opt.locale), opt && opt.message || "Invalid alpha")
    }

    export function alphanumeric(opt?: Opt & { locale?: validatorJs.AlphaLocale }) {
        return check(x => validatorJs.isAlphanumeric(x, opt && opt.locale), opt && opt.message || "Invalid alpha numeric")
    }

    export function ascii(opt?: Opt) {
        return check(x => validatorJs.isAscii(x), opt && opt.message || "Invalid ascii")
    }

    export function base64(opt?: Opt) {
        return check(x => validatorJs.isBase64(x), opt && opt.message || "Invalid base 64")
    }

    export function before(opt?: Opt & { date?: string }) {
        return check(x => validatorJs.isBefore(x, opt && opt.date), opt && opt.message || `Date must be less than ${opt && opt.date || "today"}`)
    }

    export function byteLength(opt: Opt & validatorJs.IsByteLengthOptions) {
        return check(x => validatorJs.isByteLength(x, opt), opt && opt.message || "Invalid byte length")
    }

    export function creditCard(opt?: Opt) {
        return check(x => validatorJs.isCreditCard(x), opt && opt.message || "Invalid credit card number")
    }

    export function currency(opt?: Opt & validatorJs.IsCurrencyOptions) {
        return check(x => validatorJs.isCurrency(x, opt), opt && opt.message || "Invalid currency")
    }

    export function dataURI(opt?: Opt) {
        return check(x => validatorJs.isDataURI(x), opt && opt.message || "Invalid data URI")
    }

    export function decimal(opt?: Opt & validatorJs.IsDecimalOptions) {
        return check(x => validatorJs.isDecimal(x, opt), opt && opt.message || "Invalid decimal")
    }

    export function divisibleBy(opt: Opt & { num: number }) {
        return check(x => validatorJs.isDivisibleBy(x, opt.num), opt && opt.message || `Not divisible by ${opt.num}`)
    }

    export function email(opt?: Opt & validatorJs.IsEmailOptions) {
        return check(x => validatorJs.isEmail(x, opt), opt && opt.message || "Invalid email address")
    }

    export function fqdn(opt?: Opt & validatorJs.IsFQDNOptions) {
        return check(x => validatorJs.isFQDN(x, opt), opt && opt.message || "Invalid FQDN")
    }

    export function float(opt?: Opt & validatorJs.IsFloatOptions) {
        return check(x => validatorJs.isFloat(x, opt), opt && opt.message || "Invalid float number")
    }

    export function fullWidth(opt?: Opt) {
        return check(x => validatorJs.isFullWidth(x), opt && opt.message || "Invalid value provided")
    }

    export function halfWidth(opt?: Opt) {
        return check(x => validatorJs.isHalfWidth(x), opt && opt.message || "Invalid value provided")
    }

    export function hash(opt: Opt & { algorithm: validatorJs.HashAlgorithm }) {
        return check(x => validatorJs.isHash(x, opt.algorithm), opt && opt.message || "Invalid hash")
    }

    export function hexColor(opt?: Opt) {
        return check(x => validatorJs.isHexColor(x), opt && opt.message || "Invalid hex color")
    }

    export function hexadecimal(opt?: Opt) {
        return check(x => validatorJs.isHexadecimal(x), opt && opt.message || "Invalid hexadecimal")
    }

    export function ip(opt?: Opt & { version?: "4" | "6" }) {
        return check(x => validatorJs.isIP(x, opt && opt.version), opt && opt.message || "Invalid IP address")
    }

    export function isbn(opt?: Opt & { version?: "10" | "13" }) {
        return check(x => validatorJs.isISBN(x, opt && opt.version), opt && opt.message || "Invalid ISBN")
    }

    export function isin(opt?: Opt) {
        return check(x => validatorJs.isISIN(x), opt && opt.message || "Invalid ISIN")
    }

    export function iso31661Alpha2(opt?: Opt) {
        return check(x => validatorJs.isISO31661Alpha2(x), opt && opt.message || "Invalid ISO 31661 Alpha 2")
    }

    export function iso8601(opt?: Opt) {
        return check(x => validatorJs.isISO8601(x), opt && opt.message || "Invalid ISO 8601 date")
    }

    export function isrc(opt?: Opt) {
        return check(x => validatorJs.isISRC(x), opt && opt.message || "Invalid ISRC")
    }

    export function issn(opt?: Opt & validatorJs.IsISSNOptions) {
        return check(x => validatorJs.isISSN(x, opt), opt && opt.message || "Invalid ISSN")
    }

    export function int(opt?: Opt & validatorJs.IsIntOptions) {
        return check(x => validatorJs.isInt(x, opt), opt && opt.message || "Invalid integer")
    }

    export function json(opt?: Opt) {
        return check(x => validatorJs.isJSON(x), opt && opt.message || "Invalid JSON")
    }

    export function latLong(opt?: Opt) {
        return check(x => validatorJs.isLatLong(x), opt && opt.message || "Invalid lat long")
    }

    export function length(opt: Opt & validatorJs.IsLengthOptions) {
        return check(x => validatorJs.isLength(x, opt), opt && opt.message || "Invalid length")
    }

    export function lowerCase(opt?: Opt) {
        return check(x => validatorJs.isLowercase(x), opt && opt.message || "Invalid lower case")
    }

    export function macAddress(opt?: Opt) {
        return check(x => validatorJs.isMACAddress(x), opt && opt.message || "Invalid MAC address")
    }

    export function matches(opt: Opt & { pattern: string, modifier?: string }) {
        return check(x => validatorJs.matches(x, opt.pattern, opt.modifier), opt.message || "Invalid string")
    }

    export function md5(opt?: Opt) {
        return check(x => validatorJs.isMD5(x), opt && opt.message || "Invalid MD5 hash")
    }

    export function mimeType(opt?: Opt) {
        return check(x => validatorJs.isMimeType(x), opt && opt.message || "Invalid mime type")
    }

    export function mobilePhone(opt?: Opt & { locale?: validatorJs.MobilePhoneLocale, options?: validatorJs.IsMobilePhoneOptions }) {
        return check(x => validatorJs.isMobilePhone(x, opt && opt.locale, opt && opt.options), opt && opt.message || "Invalid mobile phone")
    }

    export function mongoId(opt?: Opt) {
        return check(x => validatorJs.isMongoId(x), opt && opt.message || "Invalid MongoDb id")
    }

    export function multibyte(opt?: Opt) {
        return check(x => validatorJs.isMultibyte(x), opt && opt.message || "Invalid multi byte")
    }

    export function numeric(opt?: Opt & validatorJs.IsNumericOptions) {
        return check(x => validatorJs.isNumeric(x), opt && opt.message || "Invalid numeric")
    }

    export function port(opt?: Opt) {
        return check(x => validatorJs.isPort(x), opt && opt.message || "Invalid port")
    }

    export function postalCode(opt?: Opt & { locale?: validatorJs.PostalCodeLocale }) {
        return check(x => validatorJs.isPostalCode(x, opt && opt.locale || "any"), opt && opt.message || "Invalid postal code")
    }

    export function slug(opt?: Opt) {
        return check(x => validatorJs.isSlug(x), opt && opt.message || "Invalid slug")
    }

    export function surrogatePair(opt?: Opt) {
        return check(x => validatorJs.isSurrogatePair(x), opt && opt.message || "Invalid surrogate pair")
    }

    export function url(opt?: Opt & validatorJs.IsURLOptions) {
        return check(x => validatorJs.isURL(x, opt), opt && opt.message || "Invalid url")
    }

    export function UUID(opt?: Opt & { version?: 3 | 4 | 5 | "3" | "4" | "5" | "all" }) {
        return check(x => validatorJs.isUUID(x), opt && opt.message || "Invalid UUID")
    }

    export function uppercase(opt?: Opt) {
        return check(x => validatorJs.isUppercase(x), opt && opt.message || "Invalid uppercase")
    }

    export function variableWidth(opt?: Opt) {
        return check(x => validatorJs.isVariableWidth(x), opt && opt.message || "Invalid variable width")
    }

    export function whiteListed(opt: Opt & { chars: string | string[] }) {
        return check(x => validatorJs.isWhitelisted(x, opt && opt.chars), opt && opt.message || "Invalid white listed")
    }

    export function required() {
        return v.required()
    }

    export function partial(typ: TypeOverride | ((x: any) => TypeOverride)) {
        return v.partial(typ)
    }
}


export { val, Opt }