import { transformController, router } from "../../src/router";
import Koa from "koa"
import Supertest from "supertest"
import { Class } from '../../src/libs/ioc-container';
import { route } from '../../src';

function fixture(controller:Class<any>){
    const route = transformController(controller)
    const app = new Koa()
    
    app.use(router(route[0], async (ctx, next) => {
        ctx.body = "OK"
    }))
    return app.callback()
}

describe("Router", () => {
    it("Should route basic controller", async () => {
        class AnimalController {
            get(id:number){}
        }
        const app = fixture(AnimalController)
        await Supertest(app)
            .get("/animal/get?id=1234")
            .expect(200, "OK")
    })
    it("Should route controller with param", async () => {
        class AnimalController {
            @route.get(":id")
            get(id:number){}
        }
        const app = fixture(AnimalController)
        await Supertest(app)
            .get("/animal/1234")
            .expect(200, "OK")
    })
    it("Should route controller with root", async () => {
        @route.root("/beast/:type/animal")
        class AnimalController {
            @route.get(":id")
            get(id:number){}
        }
        const app = fixture(AnimalController)
        await Supertest(app)
            .get("/beast/bat/animal/rabbit")
            .expect(200, "OK")
    })
})