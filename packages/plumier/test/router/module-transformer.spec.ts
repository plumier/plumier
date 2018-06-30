import { join } from "path";

import { transformModule } from "../../src/router";

describe("Module Transformer Tests", () => {
    it("Should parse basic controller", async () => {
        const route = await transformModule(join(__dirname, "./controller/basic-controller.js"))
        expect(route).toMatchObject([
            { method: 'get', url: '/basic/getanimal' },
            { method: 'get', url: '/basic/getanimallist' },
        ])
    })

    it("Should parse decorated controller", async () => {
        const route = await transformModule(join(__dirname, "./controller/decorated-controller.js"))
        expect(route).toMatchObject([
            { method: 'post', url: '/decorated/saveanimal' },
            { method: 'get', url: '/decorated/:id' },
            { method: 'get', url: '/decorated/getanimallist' },
            { method: 'post', url: '/root/saveanimal' },
            { method: 'delete', url: '/decorated/:id' },
            { method: 'put', url: '/root/name/:name' },
            { method: 'get', url: '/root/getanimallist' }
        ])
    })

    it("Should parse all controllers inside directory", async () => {
        const route = await transformModule(join(__dirname, "./controller"))
        expect(route).toMatchObject([
            { method: 'get', url: '/basic/getanimal' },
            { method: 'get', url: '/basic/getanimallist' },
            { method: 'post', url: '/decorated/saveanimal' },
            { method: 'get', url: '/decorated/:id' },
            { method: 'get', url: '/decorated/getanimallist' },
            { method: 'post', url: '/root/saveanimal' },
            { method: 'delete', url: '/decorated/:id' },
            { method: 'put', url: '/root/name/:name' },
            { method: 'get', url: '/root/getanimallist' },
            { method: 'get', url: '/ignore/getanimallist' }
        ])
    })

    it("Should not parse ignored action properly", async () => {
        const route = await transformModule(join(__dirname, "./controller/ignore-controller.js"))
        expect(route).toMatchObject([
            { method: 'get', url: '/ignore/getanimallist' },
        ])
    })
})