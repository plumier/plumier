import { CustomPropertyDecorator, TypeOverride } from "@plumier/reflect"
import validatorJs from "validator"

import * as v from "./validation"

interface Opt { message?: string }

namespace val {
    function check(validator: (x: string) => boolean, message: string) {
        return v.createValidation(x => !validator(x) ? message : undefined)
    }

    /**
     * Check if the string is a date that's after the specified date
     * @param date date, default now
     */
    export function after(date?: string): CustomPropertyDecorator
    /**
     * Check if the string is a date that's after the specified date
     * @param opt options
     */
    export function after(opt?: Opt & { date?: string }): CustomPropertyDecorator
    export function after(op?: string | Opt & { date?: string }) {
        const opt = typeof op === "string" ? { date: op, message: undefined } : op
        return check(x => validatorJs.isAfter(x, opt && opt.date), opt && opt.message || `Date must be greater than ${opt && opt.date || "today"}`)
    }

    /**
     * Check if the string contains only letters (a-zA-Z).
     * @param opt options
     */
    export function alpha(opt?: Opt & { locale?: validatorJs.AlphaLocale }) {
        return check(x => validatorJs.isAlpha(x, opt && opt.locale), opt && opt.message || "Invalid alpha")
    }

    /**
     * Check if the string contains only letters and numbers.
     * @param opt options
     */
    export function alphanumeric(opt?: Opt & { locale?: validatorJs.AlphaLocale }) {
        return check(x => validatorJs.isAlphanumeric(x, opt && opt.locale), opt && opt.message || "Invalid alpha numeric")
    }

    /**
     * Check if the string contains ASCII chars only.
     * @param opt options
     */
    export function ascii(opt?: Opt) {
        return check(x => validatorJs.isAscii(x), opt && opt.message || "Invalid ascii")
    }

    /**
     * Check if a string is base64 encoded.
     * @param opt options
     */
    export function base64(opt?: Opt) {
        return check(x => validatorJs.isBase64(x), opt && opt.message || "Invalid base 64")
    }

    /**
     * Check if the string is a date that's before the specified date.
     * @param date date, default now
     */
    export function before(date?: string): CustomPropertyDecorator
    /**
     * Check if the string is a date that's before the specified date.
     * @param opt options
     */
    export function before(opt?: Opt & { date?: string }): CustomPropertyDecorator
    export function before(op?: string | Opt & { date?: string }) {
        const opt = typeof op === "string" ? { date: op, message: undefined } : op
        return check(x => validatorJs.isBefore(x, opt && opt.date), opt && opt.message || `Date must be less than ${opt && opt.date || "today"}`)
    }

    /**
     * Check if the string's length (in UTF-8 bytes) falls in a range.
     * @param opt options
     */
    export function byteLength(opt: Opt & validatorJs.IsByteLengthOptions) {
        return check(x => validatorJs.isByteLength(x, opt), opt && opt.message || "Invalid byte length")
    }

    /**
     * Check if the string is a credit card.
     * @param opt options
     */
    export function creditCard(opt?: Opt) {
        return check(x => validatorJs.isCreditCard(x), opt && opt.message || "Invalid credit card number")
    }

    /**
     * Check if the string is a valid currency amount.
     * @param opt options
     */
    export function currency(opt?: Opt & validatorJs.IsCurrencyOptions) {
        return check(x => validatorJs.isCurrency(x, opt), opt && opt.message || "Invalid currency")
    }

    /**
     * Check if the string is a [data uri format](https://developer.mozilla.org/en-US/docs/Web/HTTP/data_URIs).
     * @param opt options
     */
    export function dataURI(opt?: Opt) {
        return check(x => validatorJs.isDataURI(x), opt && opt.message || "Invalid data URI")
    }

    /**
     * Check if the string represents a decimal number, such as 0.1, .3, 1.1, 1.00003, 4.0 etc.
     * @param opt options
     */
    export function decimal(opt?: Opt & validatorJs.IsDecimalOptions) {
        return check(x => validatorJs.isDecimal(x, opt), opt && opt.message || "Invalid decimal")
    }

    /**
     * Check if the string is a number that's divisible by another.
     * @param num divider number
     */
    export function divisibleBy(num: number): CustomPropertyDecorator
    /**
     * Check if the string is a number that's divisible by another.
     * @param opt options
     */
    export function divisibleBy(opt: Opt & { num: number }): CustomPropertyDecorator
    export function divisibleBy(op: number | Opt & { num: number }) {
        const opt = typeof op === "number" ? { num: op, message: undefined } : op
        return check(x => validatorJs.isDivisibleBy(x, opt.num), opt && opt.message || `Not divisible by ${opt.num}`)
    }

    /**
     * Check if the string is an email.
     * @param opt options
     */
    export function email(opt?: Opt & validatorJs.IsEmailOptions) {
        return check(x => validatorJs.isEmail(x, opt), opt && opt.message || "Invalid email address")
    }

    /**
     * Check if the string is a fully qualified domain name (e.g. domain.com).
     * @param opt options
     */
    export function fqdn(opt?: Opt & validatorJs.IsFQDNOptions) {
        return check(x => validatorJs.isFQDN(x, opt), opt && opt.message || "Invalid FQDN")
    }

    /**
     * Check if the string is a float.
     * @param opt options
     */
    export function float(opt?: Opt & validatorJs.IsFloatOptions) {
        return check(x => validatorJs.isFloat(x, opt), opt && opt.message || "Invalid float number")
    }

    /**
     * Check if the string contains any full-width chars.
     * @param opt options
     */
    export function fullWidth(opt?: Opt) {
        return check(x => validatorJs.isFullWidth(x), opt && opt.message || "Invalid value provided")
    }

    /**
     * Check if the string contains any half-width chars.
     * @param opt options
     */
    export function halfWidth(opt?: Opt) {
        return check(x => validatorJs.isHalfWidth(x), opt && opt.message || "Invalid value provided")
    }

    /**
     * Check if the string is a hash of type algorithm.
     * @param algorithm algorithm
     */
    export function hash(algorithm: validatorJs.HashAlgorithm): CustomPropertyDecorator
    /**
     * Check if the string is a hash of type algorithm.
     * @param opt options
     */
    export function hash(opt: Opt & { algorithm: validatorJs.HashAlgorithm }): CustomPropertyDecorator
    export function hash(op: validatorJs.HashAlgorithm | Opt & { algorithm: validatorJs.HashAlgorithm }) {
        const opt = typeof op === "string" ? { algorithm: op, message: undefined } : op
        return check(x => validatorJs.isHash(x, opt.algorithm), opt && opt.message || "Invalid hash")
    }

    /**
     * Check if the string is a hexadecimal color.
     * @param opt options
     */
    export function hexColor(opt?: Opt) {
        return check(x => validatorJs.isHexColor(x), opt && opt.message || "Invalid hex color")
    }

    /**
     * Check if the string is a hexadecimal number.
     * @param opt options
     */
    export function hexadecimal(opt?: Opt) {
        return check(x => validatorJs.isHexadecimal(x), opt && opt.message || "Invalid hexadecimal")
    }

    /**
     * Check if the string is an IP (version 4 or 6).
     * @param version IP version
     */
    export function ip(version?: "4" | "6"): CustomPropertyDecorator
    /**
     * Check if the string is an IP (version 4 or 6).
     * @param opt options
     */
    export function ip(opt?: Opt & { version?: "4" | "6" }): CustomPropertyDecorator
    export function ip(op?: "4" | "6" | Opt & { version?: "4" | "6" }) {
        const opt = typeof op === "string" ? { version: op, message: undefined } : op
        return check(x => validatorJs.isIP(x, opt && opt.version), opt && opt.message || "Invalid IP address")
    }

    /**
     * Check if the string is an ISBN (version 10 or 13).
     * @param version ISBN version
     */
    export function isbn(version?: "10" | "13"): CustomPropertyDecorator
    /**
     * Check if the string is an ISBN (version 10 or 13).
     * @param opt options
     */
    export function isbn(opt?: Opt & { version?: "10" | "13" }): CustomPropertyDecorator
    export function isbn(op?: "10" | "13" | Opt & { version?: "10" | "13" }) {
        const opt = typeof op === "string" ? { version: op, message: undefined } : op
        return check(x => validatorJs.isISBN(x, opt && opt.version), opt && opt.message || "Invalid ISBN")
    }

    /**
     * Check if the string is an [ISIN](https://en.wikipedia.org/wiki/International_Securities_Identification_Number) (stock/security identifier).
     * @param opt options
     */
    export function isin(opt?: Opt) {
        return check(x => validatorJs.isISIN(x), opt && opt.message || "Invalid ISIN")
    }

    /**
     * Check if the string is a valid [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) officially assigned country code.
     * @param opt options
     */
    export function iso31661Alpha2(opt?: Opt) {
        return check(x => validatorJs.isISO31661Alpha2(x), opt && opt.message || "Invalid ISO 31661 Alpha 2")
    }

    /**
     * Check if the string is a valid [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) date.
     * @param opt options
     */
    export function iso8601(opt?: Opt) {
        return check(x => validatorJs.isISO8601(x), opt && opt.message || "Invalid ISO 8601 date")
    }

    /**
     * Check if the string is a [ISRC](https://en.wikipedia.org/wiki/International_Standard_Recording_Code).
     * @param opt options
     */
    export function isrc(opt?: Opt) {
        return check(x => validatorJs.isISRC(x), opt && opt.message || "Invalid ISRC")
    }

    /**
     * Check if the string is an [ISSN](https://en.wikipedia.org/wiki/International_Standard_Serial_Number).
     * @param opt options
     */
    export function issn(opt?: Opt & validatorJs.IsISSNOptions) {
        return check(x => validatorJs.isISSN(x, opt), opt && opt.message || "Invalid ISSN")
    }

    /**
     * Check if the string is an integer.
     * @param opt options
     */
    export function int(opt?: Opt & validatorJs.IsIntOptions) {
        return check(x => validatorJs.isInt(x, opt), opt && opt.message || "Invalid integer")
    }

    /**
     * Check if the string is valid JSON (note: uses JSON.parse).
     * @param opt options
     */
    export function json(opt?: Opt) {
        return check(x => validatorJs.isJSON(x), opt && opt.message || "Invalid JSON")
    }

    /**
     * Check if the string is a valid latitude-longitude coordinate in the format:
     *
     * `lat,long` or `lat, long`.
     * @param opt options
     */
    export function latLong(opt?: Opt) {
        return check(x => validatorJs.isLatLong(x), opt && opt.message || "Invalid lat long")
    }

    /**
     * Check if the string's length falls in a range.
     *
     * Note: this function takes into account surrogate pairs.
     * @param opt options
     */
    export function length(opt: Opt & validatorJs.IsLengthOptions) {
        return check(x => validatorJs.isLength(x, opt), opt && opt.message || "Invalid length")
    }

    /**
     * Check if the string is lowercase.
     * @param opt options
     */
    export function lowerCase(opt?: Opt) {
        return check(x => validatorJs.isLowercase(x), opt && opt.message || "Invalid lower case")
    }

    /**
     * Check if the string is a MAC address.
     * @param opt options
     */
    export function macAddress(opt?: Opt) {
        return check(x => validatorJs.isMACAddress(x), opt && opt.message || "Invalid MAC address")
    }

    /**
     * Check if the string is a MD5 hash.
     * @param opt options
     */
    export function md5(opt?: Opt) {
        return check(x => validatorJs.isMD5(x), opt && opt.message || "Invalid MD5 hash")
    }

    /**
     * Check if the string matches to a valid [MIME type](https://en.wikipedia.org/wiki/Media_type) format.
     * @param opt options
     */
    export function mimeType(opt?: Opt) {
        return check(x => validatorJs.isMimeType(x), opt && opt.message || "Invalid mime type")
    }

    /**
     * Check if the string is a mobile phone number.
     * @param opt options
     */
    export function mobilePhone(opt?: Opt & { locale?: validatorJs.MobilePhoneLocale, options?: validatorJs.IsMobilePhoneOptions }) {
        return check(x => validatorJs.isMobilePhone(x, opt && opt.locale, opt && opt.options), opt && opt.message || "Invalid mobile phone")
    }

    /**
     * Check if the string is a valid hex-encoded representation of a [MongoDB ObjectId](http://docs.mongodb.org/manual/reference/object-id/).
     * @param opt options
     */
    export function mongoId(opt?: Opt) {
        return check(x => validatorJs.isMongoId(x), opt && opt.message || "Invalid MongoDb id")
    }

    /**
     * Check if the string contains one or more multibyte chars.
     * @param opt options
     */
    export function multibyte(opt?: Opt) {
        return check(x => validatorJs.isMultibyte(x), opt && opt.message || "Invalid multi byte")
    }

    /**
     * Check if the string contains only numbers.
     * @param opt options
     */
    export function numeric(opt?: Opt & validatorJs.IsNumericOptions) {
        return check(x => validatorJs.isNumeric(x), opt && opt.message || "Invalid numeric")
    }

    /**
     * Check if the string is a valid port number.
     * @param opt options
     */
    export function port(opt?: Opt) {
        return check(x => validatorJs.isPort(x), opt && opt.message || "Invalid port")
    }

    /**
     * Check if the string is a postal code
     * @param opt options
     */
    export function postalCode(opt?: Opt & { locale?: validatorJs.PostalCodeLocale }) {
        return check(x => validatorJs.isPostalCode(x, opt && opt.locale || "any"), opt && opt.message || "Invalid postal code")
    }

    /**
     * Check if string matches the pattern.
     * @param pattern RegExp pattern
     */
    export function regex(pattern: RegExp): CustomPropertyDecorator
    /**
     * Check if string matches the pattern.
     * @param opt options
     */
    export function regex(opt: Opt & { pattern: RegExp }): CustomPropertyDecorator
    export function regex(op: RegExp | Opt & { pattern: RegExp }) {
        const opt = op instanceof RegExp ? { pattern: op, message: undefined } : op
        return check(x => validatorJs.matches(x, opt.pattern), opt.message || "Invalid string")
    }

    /**
     * Check if the string is of type slug.
     * @param opt options
     */
    export function slug(opt?: Opt) {
        return check(x => validatorJs.isSlug(x), opt && opt.message || "Invalid slug")
    }

    /**
     * Check if the string contains any surrogate pairs chars.
     * @param opt options
     */
    export function surrogatePair(opt?: Opt) {
        return check(x => validatorJs.isSurrogatePair(x), opt && opt.message || "Invalid surrogate pair")
    }

    /**
     * Check if the string is an URL.
     * @param opt options
     */
    export function url(opt?: Opt & validatorJs.IsURLOptions) {
        return check(x => validatorJs.isURL(x, opt), opt && opt.message || "Invalid url")
    }

    /**
     * Check if the string is a UUID (version 3, 4 or 5).
     * @param opt options
     */
    export function UUID(opt?: Opt & { version?: 3 | 4 | 5 | "3" | "4" | "5" | "all" }) {
        return check(x => validatorJs.isUUID(x), opt && opt.message || "Invalid UUID")
    }

    /**
     * Check if the string is uppercase.
     * @param opt options
     */
    export function uppercase(opt?: Opt) {
        return check(x => validatorJs.isUppercase(x), opt && opt.message || "Invalid uppercase")
    }

    /**
     * Check if the string contains a mixture of full and half-width chars.
     * @param opt options
     */
    export function variableWidth(opt?: Opt) {
        return check(x => validatorJs.isVariableWidth(x), opt && opt.message || "Invalid variable width")
    }

    /**
     * Checks characters if they appear in the whitelist.
     * @param opt options
     */
    export function whiteListed(opt: Opt & { chars: string | string[] }) {
        return check(x => validatorJs.isWhitelisted(x, opt && opt.chars), opt && opt.message || "Invalid white listed")
    }

    /**
     * Mark if the property is required
     */
    export function required() {
        return v.required()
    }

    /**
     * Mark parameter data type as partial, any required validation will be ignored
     * @param typ parameter data type
     */
    export function partial(typ: TypeOverride | ((x: any) => TypeOverride)) {
        return v.partial(typ)
    }
}


export { val, Opt }