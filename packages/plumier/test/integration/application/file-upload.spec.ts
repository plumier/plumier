import { fixture } from "../../helper";
import { bind, FileParser, route, FileUploadInfo } from '@plumjs/core';
import { FileUploadFacility } from '../../../src/application';
import { join, extname } from 'path';
import Supertest from "supertest"
import { unlinkSync, existsSync } from 'fs';

describe("File Upload", () => {
    it("Should upload file properly", async () => {
        const fn = jest.fn()
        class ImageController {
            @route.post()
            async upload(@bind.file() parser: FileParser) {
                const files = await parser.parse()
                fn(files)
            }
        }
        const app = fixture(ImageController)
        app.set(new FileUploadFacility({ uploadPath: join(__dirname, "./upload") }))
        const koa = await app.initialize()
        await Supertest(koa.callback())
            .post("/image/upload")
            .attach("file", join(__dirname, "./assets/index.html"))
            .expect(200)
        const info: FileUploadInfo = fn.mock.calls[0][0][0]
        const filePath = join(__dirname, "upload", info.name)
        expect(extname(info.name)).toEqual(".html")
        expect(info.size).toBe(385)
        expect(info.field).toBe("file")
        expect(existsSync(filePath)).toBe(true)
        unlinkSync(filePath)
    })
})