import { val, AsyncValidatorResult } from "@plumier/core"
import { FormFile } from "@plumier/core"
import bytes from "bytes"

declare module "@plumier/validator" {
    namespace val {
        export function file(maxSize: string | number): (...arg: any[]) => void
        export function file(opt: { maxSize?: string | number, mime?: string | RegExp, invalidMimeMessage?: string, invalidSizeMessage?: string }): (...arg: any[]) => void
        export function image(): (...arg: any[]) => void
        export function image(maxSize?: string | number): (...arg: any[]) => void
        export function image(opt: { maxSize?: string | number, invalidSizeMessage?: string, invalidImageMessage?: string }): (...arg: any[]) => void
    }
}

function validateSize(opt: string | number, val: number, msg?: string): string | undefined {
    const expected = (typeof opt === "string") ? bytes(opt) : opt
    if (val > expected) return msg ?? "File size exceed the limit allowed"
}

function validateMime(opt: string | RegExp, val: string, msg?: string): string | undefined {
    const regex = new RegExp(opt)
    if (!regex.test(val)) return msg ?? "Invalid file type"
}

function validateFile(opt: { maxSize?: string | number, mime?: string | RegExp, invalidMimeMessage?: string, invalidSizeMessage?: string } | string | number, val: FormFile) {
    const list: (string | undefined)[] = []
    if (typeof opt === "object") {
        if (opt.maxSize)
            list.push(validateSize(opt.maxSize, val.size, opt.invalidSizeMessage))
        if (opt.mime)
            list.push(validateMime(opt.mime, val.type, opt.invalidMimeMessage))
    }
    else
        list.push(validateSize(opt, val.size))
    const result = list.filter((x): x is string => !!x)
    if (result.length > 0) return result.join(", ")
}

val.file = (opt: { maxSize?: string | number, mime?: string | RegExp, invalidMimeMessage?: string, invalidSizeMessage?: string } | string | number) => {
    return val.custom((val: FormFile | FormFile[]) => {
        if (Array.isArray(val)) {
            const result: AsyncValidatorResult[] = []
            for (const [i, value] of val.entries()) {
                const message = validateFile(opt, value)
                if (message)
                    result.push({ path: i.toString(), messages: [message] })
            }
            return result
        }
        else return validateFile(opt, val)
    })
}

val.image = (opt?: { maxSize?: string | number, invalidSizeMessage?: string, invalidImageMessage?: string } | string | number) => {
    const invalidMimeMessage = "Invalid image file"
    if (typeof opt === "object")
        return val.file({
            ...opt, mime: /^image\//i,
            invalidMimeMessage: opt.invalidImageMessage ?? invalidMimeMessage,
            invalidSizeMessage: opt.invalidSizeMessage
        })
    else if (typeof opt === "string")
        return val.file({ maxSize: opt, mime: /^image\//i, invalidMimeMessage })
    else
        return val.file({ mime: /^image\//i, invalidMimeMessage })
}