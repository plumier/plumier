import {
    DefaultFacility,
    errorMessage,
    FileParser,
    FileUploadInfo,
    HttpStatusError,
    PlumierApplication,
} from "@plumier/core"
import Busboy from "busboy"
import crypto from "crypto"
import { createWriteStream, existsSync, mkdirSync, unlink } from "fs"
import { Context } from "koa"
import { dirname, extname, join } from "path"
import { promisify } from "util"

interface FileUploadOption {

    /**
     * Path of uploaded files (required)
     */
    uploadPath: string,

    /**
     * Maximum file size (in bytes) allowed, default: infinity
     */
    maxFileSize?: number;

    /**
     * Maximum number of files uploaded, default; infinity
     */
    maxFiles?: number;
}


export function mkdirp(path: string) {
    var dir = dirname(path);
    if (!existsSync(dir)) {
        mkdirp(dir);
    }
    mkdirSync(path);
}

class BusboyParser implements FileParser {
    busboy: busboy.Busboy
    nameGenerator: (original:string) => string
    constructor(private context: Context, private option: FileUploadOption) {
        this.busboy = new Busboy({
            headers: this.context.request.headers,
            limits: {
                fileSize: this.option.maxFileSize,
                files: this.option.maxFiles
            }
        })
        this.nameGenerator = (original:string) => crypto.randomBytes(12).toString("hex") + extname(original)
    }

    save(subDirectory?: string): Promise<FileUploadInfo[]> {
        return new Promise<FileUploadInfo[]>((resolve, reject) => {
            const result: FileUploadInfo[] = []
            const unlinkAsync = promisify(unlink)
            const deleteAll = async () => await Promise.all(result
                .map(x => unlinkAsync(join(this.option.uploadPath, x.fileName))))
            const rollback = async () => {
                this.context.req.unpipe()
                await deleteAll()
            }
            this.busboy
                .on("file", (field, stream, originalName, encoding, mime) => {
                    try {
                        const fileName = join(subDirectory || "", this.nameGenerator(originalName))
                        if (subDirectory && !existsSync(join(this.option.uploadPath, subDirectory)))
                            mkdirp(join(this.option.uploadPath, subDirectory))
                        const fullPath = join(this.option.uploadPath, fileName)
                        const info = { field, encoding, fileName, mime, originalName, size: 0 }
                        result.push(info)
                        stream
                            .on("data", (data: Buffer) => { info.size += data.length })
                            .on("limit", async () => {
                                await rollback()
                                reject(new HttpStatusError(422, errorMessage.FileSizeExceeded.format(originalName)))
                            })
                            .pipe(createWriteStream(fullPath))
                    }
                    catch (e) {
                        reject(new Error(e.stack))
                    }
                })
                .on("filesLimit", async () => {
                    await rollback()
                    reject(new HttpStatusError(422, errorMessage.NumberOfFilesExceeded))
                })
                .on("finish", () => {
                    resolve(result)
                })
                .on("error", (e: any) => {
                    reject(e)
                })
            this.context.req.pipe(this.busboy)
        })
    }
}

/**
 * Add multi part file upload facility
 */
export class MultiPartFacility extends DefaultFacility {
    constructor(private option: FileUploadOption) { super() }

    setup(app: Readonly<PlumierApplication>) {
        Object.assign(app.config, { fileParser: (ctx: Context) => new BusboyParser(ctx, this.option) })
    }
}