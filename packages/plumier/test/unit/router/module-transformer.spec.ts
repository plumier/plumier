import { join } from "path";

import { transformModule } from "../../../src/router";

describe("Module Transformer Tests", () => {
    it("Should parse basic controller", async () => {
        const route = await transformModule(join(__dirname, "./controller/basic-controller.ts"), [".ts"])
        expect(route).toMatchObject([
            { method: 'get', url: '/basic/getanimal' },
            { method: 'get', url: '/basic/getanimallist' },
        ])
    })

    it("Should parse decorated controller", async () => {
        const route = await transformModule(join(__dirname, "./controller/decorated-controller.ts"), [".ts"])
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
        const route = await transformModule(join(__dirname, "./controller"), [".ts"])
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

    it("Should parse controllers with nested directory", async () => {
        const route = await transformModule(join(__dirname, "./nested"), [".ts"])
        expect(route).toMatchObject([
            { method: 'get', url: '/api/v1/basic/getanimal' },
            { method: 'get', url: '/api/v1/basic/getanimallist' },
            { method: 'get', url: '/api/v2/basic/getanimal' },
            { method: 'get', url: '/api/v2/basic/getanimallist' },
        ])
    })

    it("Should not parse ignored action properly", async () => {
        const route = await transformModule(join(__dirname, "./controller/ignore-controller.ts"), [".ts"])
        expect(route).toMatchObject([
            { method: 'get', url: '/ignore/getanimallist' },
        ])
    })
})