import { response, route } from "@plumjs/plumier";
import { join } from 'path';
import { fixture } from '../../helper';
import Supertest from "supertest"
import { readFileSync } from 'fs';

describe("Serve File", () => {
    it("Should be able to serve file with correct mime type", async () => {
        const path = join(__dirname, "./assets/index.html")
        class HomeController {
            @route.get("/")
            index(){
                return response.file(path)
            }
        }
        const app = fixture(HomeController)
        const koa = await app.initialize()
        const result = await Supertest(koa.callback())
            .get("/")
            .expect(200)
        expect(result.type).toBe("text/html")
        const file = readFileSync(path).toString()
        expect(result.text).toEqual(file)
    })

    it("Should return 500 if file not found", async () => {
        const path = join(__dirname, "./assets/data.html")
        class HomeController {
            @route.get("/")
            index(){
                return response.file(path)
            }
        }
        const app = fixture(HomeController)
        const koa = await app.initialize()
        koa.on("error", () => {})
        const result = await Supertest(koa.callback())
            .get("/")
            .expect(500)
    })
})