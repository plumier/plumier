import { Plumier, WebApiFacility, Facility, Configuration } from "../../src";
import { reflect } from '../../src/libs/reflect';
import { Class } from '../../src/libs/ioc-container';



describe("Plumier", () => {
    test("Basic Controller", async () => {
        const app = new Plumier()
        const koa = await app
            .use(async (x, y) => {})
            .set({})
            .set({ rootPath: __dirname })
            .set(new WebApiFacility())
            .initialize()
    })

})