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
import { createReadStream, createWriteStream, exists, mkdir } from "fs"
import { Context } from "koa"
import os from "os"
import { basename, dirname, extname, join } from "path"
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

interface TempFile extends FileUploadInfo { validSize: boolean }

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

function saveFileToTemp(field: string, stream: NodeJS.ReadableStream, originalName: string, encoding: string, mime: string) {
    let size = 0;
    let validSize = true;
    const fileName = join(os.tmpdir(), randomFileName(originalName))
    return new Promise<TempFile>((resolve, reject) => {
        stream.on("data", (data: Buffer) => { size += data.length })
            .on("limit", () => validSize = false)
            .pipe(createWriteStream(fileName))
            .on("error", reject)
            .on("close", () => resolve({ size, fileName, validSize, encoding, mime, field, originalName }))
    })
}

function copy(source: string, dest: string) {
    return new Promise((resolve, reject) => {
        createReadStream(source)
            .pipe(createWriteStream(dest))
            .on("error", reject)
            .on("close", resolve)
    })
}

function asyncBusboy(ctx: Context, option: FileUploadOption) {
    const files: Promise<TempFile>[] = []
    return new Promise<TempFile[]>((resolve, reject) => {
        const busboy = new Busboy({
            headers: ctx.request.headers,
            limits: {
                fileSize: option.maxFileSize,
                files: option.maxFiles
            }
        })
        busboy
            .on("file", (field, stream, fileName, encoding, mime) => {
                files.push(saveFileToTemp(field, stream, fileName, encoding, mime))
            })
            .on("filesLimit", () => reject(new HttpStatusError(422, errorMessage.NumberOfFilesExceeded)))
            .on("finish", async () => {
                const temps = await Promise.all(files)
                resolve(temps)
            })
        ctx.req.pipe(busboy)
    })
}

class BusboyParser implements FileParser {
    constructor(private context: Context, private option: FileUploadOption) {}

    async save(subDirectory?: string): Promise<FileUploadInfo[]> {
        const result: FileUploadInfo[] = []
        const temps = await asyncBusboy(this.context, this.option)
        const invalid = temps.filter(x => !x.validSize)
        if (invalid.length > 0)
            throw new HttpStatusError(422, errorMessage.FileSizeExceeded.format(invalid.map(x => x.originalName).join(",")))
        for (const temp of temps) {
            const baseName = basename(temp.fileName)
            const dir = join(this.option.uploadPath, subDirectory || "")
            const destFile = join(dir, baseName)
            await checkDirectory(dir)
            await copy(temp.fileName, destFile)
            const { validSize, fileName, ...info } = temp;
            result.push({ ...info, fileName: join(subDirectory || "", baseName) })
        }
        return result;
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