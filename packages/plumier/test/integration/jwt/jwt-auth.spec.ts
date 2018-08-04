import { route } from "@plumjs/core";
import { fixture } from '../../helper';
import { JwtAuthFacility, authorize } from '@plumjs/jwt';
import { sign } from 'jsonwebtoken';
import Supertest from "supertest"

const SECRET = "super secret"
const USER_TOKEN = sign({ email: "ketut@gmail.com", role: "user" }, SECRET)
const ADMIN_TOKEN = sign({ email: "ketut@gmail.com", role: "admin" }, SECRET)
const SUPER_ADMIN_TOKEN = sign({ email: "ketut@gmail.com", role: "superadmin" }, SECRET)

describe("JwtAuth", () => {
    it("Should secure all routes by return 403 for non login user", async () => {
        class AnimalController {
            get() { return "Hello" }

            @route.post()
            save() { return "Hello" }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret: SECRET }))
            .initialize()

        await Supertest(app.callback())
            .get("/animal/get")
            .expect(403, "Forbidden")
        await Supertest(app.callback())
            .post("/animal/save")
            .expect(403, "Forbidden")
    })

    it("Should able to access route decorated with @authorize.public()", async () => {
        class AnimalController {
            @authorize.public()
            get() { return "Hello" }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret: SECRET }))
            .initialize()

        await Supertest(app.callback())
            .get("/animal/get")
            .expect(200)
    })

    it("Should able to decorate @authorize.public() in class scope", async () => {
        @authorize.public()
        class AnimalController {
            get() { return "Hello" }
            hello() { return "Hello" }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret: SECRET }))
            .initialize()

        await Supertest(app.callback())
            .get("/animal/get")
            .expect(200)
        await Supertest(app.callback())
            .get("/animal/hello")
            .expect(200)
    })

    it("Should allow login user to access non decorated route", async () => {
        class AnimalController {
            get() { return "Hello" }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret: SECRET }))
            .initialize()

        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(200)
        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
            .expect(200)
        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
            .expect(200)
    })

    it("Should allow only specific user if @authorize.role() defined", async () => {
        class AnimalController {
            @authorize.role("superadmin")
            get() { return "Hello" }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret: SECRET }))
            .initialize()

        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(401)
        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
            .expect(401)
        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
            .expect(200)
    })

    it("Should allow only some user if @authorize.role() defined", async () => {
        class AnimalController {
            @authorize.role("superadmin", "admin")
            get() { return "Hello" }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret: SECRET }))
            .initialize()

        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(401)
        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
            .expect(200)
        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
            .expect(200)
    })

    it("Should allow decorate @authorize.role() in class scope", async () => {
        @authorize.role("superadmin")
        class AnimalController {
            get() { return "Hello" }
            hello() { return "Hello" }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret: SECRET }))
            .initialize()

        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(401)
        await Supertest(app.callback())
            .get("/animal/hello")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(401)
        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
            .expect(200)
        await Supertest(app.callback())
            .get("/animal/hello")
            .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
            .expect(200)
    })

    it("Should method scoped authorization REPLACE class scope authorization", async () => {
        @authorize.role("superadmin")
        class AnimalController {
            @authorize.role("user")
            get() { return "Hello" }
            hello() { return "Hello" }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret: SECRET }))
            .initialize()

        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(200)
        await Supertest(app.callback())
            .get("/animal/hello")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(401)
        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
            .expect(401)
        await Supertest(app.callback())
            .get("/animal/hello")
            .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
            .expect(200)
    })

    it("Should able to define role with different name", async () => {
        const CUSTOM_ROLE_TOKEN = sign({ email: "ketut@gmail.com", position: "superadmin" }, SECRET)
        class AnimalController {
            @authorize.role("superadmin")
            get() { return "Hello" }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret: SECRET, roleField: "position" }))
            .initialize()

        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${CUSTOM_ROLE_TOKEN}`)
            .expect(200)
    })

    it("Should able to define role without share it in the token", async () => {
        class AnimalController {
            @authorize.role("superadmin")
            get() { return "Hello" }
        }
        const app = await fixture(AnimalController)
            .set(new JwtAuthFacility({ secret: SECRET, roleField: async x => ["superadmin"] }))
            .initialize()

        await Supertest(app.callback())
            .get("/animal/get")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(200)
    })

    describe("Hierarchical Role", () => {
        const MANAGER_ROLE_TOKEN = sign({ email: "ketut@gmail.com", role: ["level1", "level2", "level3"] }, SECRET)
        const SUPER_ROLE_TOKEN = sign({ email: "ketut@gmail.com", role: ["level2", "level3"] }, SECRET)
        const QA_ROLE_TOKEN = sign({ email: "ketut@gmail.com", role: ["level3"] }, SECRET)

        class AnimalController {
            @authorize.role("level1")
            level1() { return "Hello" }
            @authorize.role("level2")
            level2() { return "Hello" }
            @authorize.role("level3")
            level3() { return "Hello" }
        }

        it("Manager should able to access all", async () => {
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()
    
            await Supertest(app.callback())
                .get("/animal/level1")
                .set("Authorization", `Bearer ${MANAGER_ROLE_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/level2")
                .set("Authorization", `Bearer ${MANAGER_ROLE_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/level3")
                .set("Authorization", `Bearer ${MANAGER_ROLE_TOKEN}`)
                .expect(200)
        })

        it("Super only able to access level2 and level3", async () => {
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()
    
            await Supertest(app.callback())
                .get("/animal/level1")
                .set("Authorization", `Bearer ${SUPER_ROLE_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/level2")
                .set("Authorization", `Bearer ${SUPER_ROLE_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/level3")
                .set("Authorization", `Bearer ${SUPER_ROLE_TOKEN}`)
                .expect(200)
        })

        it("QA only able to access level3", async () => {
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()
    
            await Supertest(app.callback())
                .get("/animal/level1")
                .set("Authorization", `Bearer ${QA_ROLE_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/level2")
                .set("Authorization", `Bearer ${QA_ROLE_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/level3")
                .set("Authorization", `Bearer ${QA_ROLE_TOKEN}`)
                .expect(200)
        })
    })

})