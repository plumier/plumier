import {
    bind,
    DefaultFacility,
    BindingDecorator,
    errorMessage,
    FileParser,
    FileUploadInfo,
    HttpStatusError,
    PlumierApplication,
} from "@plumier/core"
import crypto from "crypto"
import { createReadStream, createWriteStream, exists, mkdir } from "fs"
import { Context } from "koa"
import { basename, dirname, extname, join } from "path"
import { promisify } from "util"
import { IncomingForm, File } from "formidable"
import { IncomingMessage } from 'http';
import { decorateParameter } from 'tinspector';


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface FileUploadOption {

    /**
     * Path of uploaded files (required)
     */
    uploadPath: string,

    /**
     * Maximum file size (in bytes) allowed, default: 20 MB
     */
    maxFileSize?: number;

    /**
     * Maximum number of files uploaded, default; 20
     */
    maxFiles?: number;
}


declare module "@plumier/core" {
    namespace bind {

        /**
         * Bind file parser for multi part file upload. This function required `FileUploadFacility`
        ```
        @route.post()
        async method(@bind.file() file:FileParser){
            const info = await file.parse()
        }
        ```
         */
        export function file(): (...args: any[]) => void
    }

    interface Configuration {
        fileParser?: (ctx:Context) => FileParser
    }
}

bind.file = () => {
    return decorateParameter(<BindingDecorator>{
        type: "ParameterBinding",
        process: ctx => {
            if (!ctx.config.fileParser) throw new Error("No file parser found in configuration")
            return ctx.config.fileParser(ctx)
        }
    })
}

// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //


const mkdirAsync = promisify(mkdir)
const existsAsync = promisify(exists)

async function mkdirpAsync(path: string) {
    var dir = dirname(path);
    if (!await existsAsync(dir)) {
        await mkdirpAsync(dir);
    }
    await mkdirAsync(path);
}

async function checkDirectory(dir: string) {
    if (!await existsAsync(dir))
        await mkdirpAsync(dir)
}

function randomFileName(original: string) {
    return crypto.randomBytes(12).toString("hex") + extname(original)
}

function copy(source: string, dest: string) {
    return new Promise((resolve, reject) => {
        createReadStream(source)
            .pipe(createWriteStream(dest))
            .on("error", reject)
            .on("close", resolve)
    })
}


async function formidableAsync(req: IncomingMessage, maxSize: number) {
    return new Promise<[string, File][]>((resolve, reject) => {
        const form = new IncomingForm()
        form.multiples = true;
        form.maxFileSize = maxSize
        form.parse(req, (err, fields, files) => {
            if (err) reject(err)
            const result: [string, File][] = []
            for (const key in files) {
                const file = files[key]
                if (Array.isArray(file)) {
                    for (const f of file)
                        result.push([key, f])
                }
                else
                    result.push([key, file])
            }
            resolve(result)
        })
    })
}

// --------------------------------------------------------------------- //
// ---------------------------- FILE PARSER ---------------------------- //
// --------------------------------------------------------------------- //

class FormidableParser implements FileParser {
    constructor(private context: Context, private option: FileUploadOption) { }

    async save(subDirectory?: string): Promise<FileUploadInfo[]> {
        const maxFile = this.option.maxFiles || 20
        const maxSize = this.option.maxFileSize || 20 * 1024 * 1024
        const subDir = join(this.option.uploadPath, subDirectory || "")
        await checkDirectory(subDir)
        try {
            const files = await formidableAsync(this.context.req, maxSize)
            if (files.length > maxFile) throw new HttpStatusError(422, "Number of files exceeded the maximum allowed")
            return Promise.all(files.map(async ([field, x]) => {
                const fileName = randomFileName(x.name)
                await copy(x.path, join(subDir, fileName))
                return <FileUploadInfo>{
                    mime: x.type,
                    fileName: join(subDirectory || "", fileName),
                    originalName: x.name, size: x.size, field
                }
            }))
        }
        catch (e) {
            if (e instanceof Error && e.message.indexOf("maxFileSize") > -1)
                throw new HttpStatusError(422, `File size exceeded the maximum size`)
            throw e
        }
    }
}

/**
 * Add multipart file upload facility
 */
export class MultiPartFacility extends DefaultFacility {
    constructor(private option: FileUploadOption) { super() }

    setup(app: Readonly<PlumierApplication>) {
        Object.assign(app.config, { fileParser: (ctx: Context) => new FormidableParser(ctx, this.option) })
    }
}