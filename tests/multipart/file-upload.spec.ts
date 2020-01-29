import { MultiPartFacility } from "@plumier/multipart"
import { existsSync, unlinkSync } from "fs"
import { removeSync } from "fs-extra"
import { extname, join } from "path"
import Plumier, { bind, Class, Configuration, FileParser, FileUploadInfo, route, WebApiFacility } from "plumier"
import Supertest from "supertest"
import reflect from 'tinspector'

export function fixture(controller: Class | Class[] | string, config?: Partial<Configuration>) {
    const mergedConfig = <Configuration>{ mode: "production", ...config }
    return new Plumier()
        .set(new WebApiFacility({ controller }))
        .set(mergedConfig)
}

describe("File Upload", () => {
    it("Should upload file properly", async () => {
        const fn = jest.fn()
        class ImageController {
            @route.post()
            async upload(@bind.file() parser: FileParser) {
                const files = await parser.save()
                fn(files)
            }
        }

        const meta = reflect(ImageController)

        const app = fixture(ImageController)
        app.set(new MultiPartFacility({ uploadPath: join(__dirname, "./upload") }))
        const koa = await app.initialize()
        await Supertest(koa.callback())
            .post("/image/upload")
            .attach("file", join(__dirname, "./assets/index.html"))
            .expect(200)
        const info: FileUploadInfo = fn.mock.calls[0][0][0]
        const filePath = join(__dirname, "upload", info.fileName)
        expect(extname(info.fileName)).toEqual(".html")
        expect(info.size).toBeGreaterThan(100)
        expect(info.field).toBe("file")
        expect(existsSync(filePath)).toBe(true)
        unlinkSync(filePath)
    })

    it("Should able to save in sub directory", async () => {
        const fn = jest.fn()
        class ImageController {
            @route.post()
            async upload(@bind.file() parser: FileParser) {
                const files = await parser.save("path/of/file")
                fn(files)
            }
        }
        const app = fixture(ImageController)
        app.set(new MultiPartFacility({ uploadPath: join(__dirname, "./upload") }))
        const koa = await app.initialize()
        await Supertest(koa.callback())
            .post("/image/upload")
            .attach("file", join(__dirname, "./assets/index.html"))
            .expect(200)
        const info: FileUploadInfo = fn.mock.calls[0][0][0]
        expect(extname(info.fileName)).toEqual(".html")
        expect(info.size).toBeGreaterThan(100)
        expect(info.field).toBe("file")
        removeSync(join(__dirname, "./upload/path/"))
    })

    // it.skip("Should return error 500 if no file parser provided", async () => {
    //     class ImageController {
    //         @route.post()
    //         async upload(@bind.file() parser: FileParser) {
    //             const files = await parser.save()
    //         }
    //     }
    //     const app = fixture(ImageController)
    //     const koa = await app.initialize()
    //     koa.on("error", () => { })
    //     await Supertest(koa.callback())
    //         .post("/image/upload")
    //         .attach("file", join(__dirname, "./assets/index.html"))
    //         .expect(500)
    // })

    it("Should able to limit file size", async () => {
        class ImageController {
            @route.post()
            async upload(@bind.file() parser: FileParser) {
                const files = await parser.save()
            }
        }
        const app = fixture(ImageController)
        app.set(new MultiPartFacility({ uploadPath: join(__dirname, "./upload"), maxFileSize: 10 }))
        const koa = await app.initialize()
        await Supertest(koa.callback())
            .post("/image/upload")
            .attach("file", join(__dirname, "./assets/index.html"))
            .expect(422, { status: 422, message: "File size exceeded the maximum size" })
    })

    it("Should able to upload array of files", async () => {
        const fn = jest.fn()
        class ImageController {
            @route.post()
            async upload(@bind.file() parser: FileParser) {
                const files = await parser.save()
                fn(files)
            }
        }
        const app = fixture(ImageController)
        app.set(new MultiPartFacility({ uploadPath: join(__dirname, "./upload") }))
        const koa = await app.initialize()
        await Supertest(koa.callback())
            .post("/image/upload")
            .attach("file", join(__dirname, "./assets/clock.jpeg"))
            .attach("file", join(__dirname, "./assets/dice.png"))
            .attach("file", join(__dirname, "./assets/index.html"))
            .expect(200)
        const info: FileUploadInfo[] = fn.mock.calls[0][0]
        expect(info.sort((a, b) => a.originalName.localeCompare(b.originalName))).toMatchObject([{
            field: 'file',
            mime: 'image/jpeg',
            originalName: 'clock.jpeg',
        },
        {
            field: 'file',
            mime: 'image/png',
            originalName: 'dice.png',
        },
        {
            field: 'file',
            mime: 'text/html',
            originalName: 'index.html',
        }])
        info.map(x => join(__dirname, "upload", x.fileName))
            .forEach(x => unlinkSync(x))
    })

    it("Should able to upload multiple files", async () => {
        const fn = jest.fn()
        class ImageController {
            @route.post()
            async upload(@bind.file() parser: FileParser) {
                const files = await parser.save()
                fn(files)
            }
        }
        const app = fixture(ImageController)
        app.set(new MultiPartFacility({ uploadPath: join(__dirname, "./upload") }))
        const koa = await app.initialize()
        await Supertest(koa.callback())
            .post("/image/upload")
            .attach("file1", join(__dirname, "./assets/clock.jpeg"))
            .attach("file2", join(__dirname, "./assets/dice.png"))
            .attach("file3", join(__dirname, "./assets/index.html"))
            .expect(200)
        const info: FileUploadInfo[] = fn.mock.calls[0][0]
        expect(info.sort((a, b) => a.originalName.localeCompare(b.originalName))).toMatchObject([{
            field: 'file1',
            mime: 'image/jpeg',
            originalName: 'clock.jpeg',
        },
        {
            field: 'file2',
            mime: 'image/png',
            originalName: 'dice.png',
        },
        {
            field: 'file3',
            mime: 'text/html',
            originalName: 'index.html',
        }])
        info.map(x => join(__dirname, "upload", x.fileName))
            .forEach(x => unlinkSync(x))
    })

    it("Should able to limit number of files on array of files", async () => {
        const fn = jest.fn()
        class ImageController {
            @route.post()
            async upload(@bind.file() parser: FileParser) {
                const files = await parser.save()
                fn(files)
            }
        }
        const app = fixture(ImageController)
        app.set(new MultiPartFacility({ uploadPath: join(__dirname, "./upload"), maxFiles: 2 }))
        const koa = await app.initialize()
        await Supertest(koa.callback())
            .post("/image/upload")
            .attach("file", join(__dirname, "./assets/clock.jpeg"))
            .attach("file", join(__dirname, "./assets/dice.png"))
            .attach("file", join(__dirname, "./assets/index.html"))
            .expect(422, { status: 422, message: "Number of files exceeded the maximum allowed" })
    })

    it("Should able to limit number of files", async () => {
        const fn = jest.fn()
        class ImageController {
            @route.post()
            async upload(@bind.file() parser: FileParser) {
                const files = await parser.save()
                fn(files)
            }
        }
        const app = fixture(ImageController)
        app.set(new MultiPartFacility({ uploadPath: join(__dirname, "./upload"), maxFiles: 2 }))
        const koa = await app.initialize()
        await Supertest(koa.callback())
            .post("/image/upload")
            .attach("file1", join(__dirname, "./assets/clock.jpeg"))
            .attach("file2", join(__dirname, "./assets/dice.png"))
            .attach("file3", join(__dirname, "./assets/index.html"))
            .expect(422, { status: 422, message: "Number of files exceeded the maximum allowed" })

    })

})