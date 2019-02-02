import { authorize, domain, route } from "@plumjs/core"
import { JwtAuthFacility } from "@plumjs/jwt"
import { val } from "@plumjs/validator"
import { sign } from "jsonwebtoken"
import Supertest from "supertest"
import { reflect } from "tinspector"

import { fixture } from "../../helper"

const SECRET = "super secret"
const USER_TOKEN = sign({ email: "ketut@gmail.com", role: "user" }, SECRET)
const ADMIN_TOKEN = sign({ email: "ketut@gmail.com", role: "admin" }, SECRET)
const SUPER_ADMIN_TOKEN = sign({ email: "ketut@gmail.com", role: "superadmin" }, SECRET)

describe("JwtAuth", () => {
    describe("Basic Authorization", () => {
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

        it("Should skip authentication for route that not handled with controller", async () => {
            class AnimalController {
                get() { return "Hello" }
            }
            const fn = jest.fn()
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .use({
                    execute: async i => {
                        fn()
                        return i.proceed()
                    }
                })
                .initialize()

            await Supertest(app.callback())
                .get("/nohandler")
                .expect(404)
            expect(fn).toBeCalled()
        })
    })

    describe("Global Authorization", () => {
        it("Should able to set authorize on global level using public", async () => {
            class AnimalController {
                get() { return "Hello" }
                @route.post()
                save() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.public() }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200)
            await Supertest(app.callback())
                .post("/animal/save")
                .expect(200)
        })

        it("Should able to set authorize on global level using role", async () => {
            class AnimalController {
                get() { return "Hello" }
                @route.post()
                save() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.role("superadmin") }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should able override global auth on controller", async () => {
            @authorize.role("user")
            class AnimalController {
                get() { return "Hello" }
                @route.post()
                save() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.public() }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .post("/animal/save")
                .expect(403)
        })

        it("Should able override global auth on action", async () => {
            class AnimalController {
                @authorize.role("user")
                get() { return "Hello" }
                @route.post()
                save() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.public() }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .post("/animal/save")
                .expect(200)
        })
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

    describe("Parameter Authorization", () => {
        class AnimalController {
            @route.post()
            save(name: string,
                @authorize.role("admin")
                id: number | undefined,
                @authorize.role("admin")
                deceased: boolean | undefined) { return "Hello" }
        }

        it("Should be able to authorize parameter", async () => {
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .send({ id: "123", name: "Mimi", deceased: "Yes" })
                .expect(401, "Unauthorized to populate parameter paths (id, deceased)")
        })

        it("Should be able to pass authorization by provided undefined", async () => {
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .send({ name: "Mimi" })
                .expect(200)
        })

        it("Should be able to pass authorization by provided valid token", async () => {
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .send({ id: "123", name: "Mimi", deceased: "Yes" })
                .expect(200)
        })
    })

    describe("Object Parameter Authorization", () => {
        @domain()
        class Animal {
            constructor(name: string,
                @authorize.role("admin")
                id: number | undefined,
                @authorize.role("admin")
                deceased: boolean | undefined) { }
        }

        class AnimalController {
            @route.post()
            save(data: Animal) { return "Hello" }
        }

        it("Should be able to authorize parameter", async () => {
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .send({ id: "123", name: "Mimi", deceased: "Yes" })
                .expect(401, "Unauthorized to populate parameter paths (data.id, data.deceased)")
        })

        it("Should be able to pass authorization by provided undefined", async () => {
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .send({ name: "Mimi" })
                .expect(200)
        })

        it("Should be able to pass authorization by provided valid token", async () => {
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .send({ id: "123", name: "Mimi", deceased: "Yes" })
                .expect(200)
        })

        it("Should work on Partial object parameter", async () => {
            class AnimalController {
                @route.post()
                save(@val.partial(Animal) data: Partial<Animal>) { return "Hello" }
            }

            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .send({ id: "123", name: "Mimi", deceased: "Yes" })
                .expect(401, "Unauthorized to populate parameter paths (data.id, data.deceased)")

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .send({ id: "123", name: "Mimi", deceased: "Yes" })
                .expect(200)
        })
    })

    describe("Array Parameter Authorization", () => {
        @domain()
        class Animal {
            constructor(name: string,
                @authorize.role("admin")
                id: number | undefined,
                @authorize.role("admin")
                deceased: boolean | undefined) { }
        }

        class AnimalController {
            @route.post()
            save(@reflect.array(Animal) data: Animal[]) { return "Hello" }
        }

        it("Should be able to authorize parameter", async () => {
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .send([{ id: "123", name: "Mimi", deceased: "Yes" }])
                .expect(401, "Unauthorized to populate parameter paths (data.0.id, data.0.deceased)")
        })

        it("Should be able to pass authorization by provided undefined", async () => {
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .send([{ name: "Mimi" }])
                .expect(200)
        })

        it("Should be able to pass authorization by provided valid token", async () => {
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .send([{ id: "123", name: "Mimi", deceased: "Yes" }])
                .expect(200)
        })

        it("Should check for parameter authorization even if the action access is public", async () => {
            class AnimalController {
                @authorize.public()
                @route.post()
                save(@reflect.array(Animal) data: Animal[]) { return "Hello" }
            }

            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .send([{ id: "123", name: "Mimi", deceased: "Yes" }])
                .expect(401, "Unauthorized to populate parameter paths (data.0.id, data.0.deceased)")
        })

        it("Should check for parameter authorization even if the controller access is public", async () => {
            @authorize.public()
            class AnimalController {
                @route.post()
                save(@reflect.array(Animal) data: Animal[]) { return "Hello" }
            }

            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .send([{ id: "123", name: "Mimi", deceased: "Yes" }])
                .expect(401, "Unauthorized to populate parameter paths (data.0.id, data.0.deceased)")
        })

        it("Should check for parameter authorization even if the controller access is public", async () => {
            class AnimalController {
                @route.post()
                save(@reflect.array(Animal) data: Animal[]) { return "Hello" }
            }

            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.public() }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .send([{ id: "123", name: "Mimi", deceased: "Yes" }])
                .expect(401, "Unauthorized to populate parameter paths (data.0.id, data.0.deceased)")
        })
    })

    describe("Inheritance Parameter Authorization", () => {
        @domain()
        class DomainBase {
            constructor(
                @authorize.role("Machine")
                @val.optional()
                public id: number = 0,

                @authorize.role("Machine")
                @val.optional()
                public createdAt: Date = new Date(),

                @authorize.role("Machine")
                @val.optional()
                public deleted: boolean = false
            ) { }
        }

        @domain()
        class Animal extends DomainBase {
            constructor(
                name: string,
                deceased: boolean
            ) { super() }
        }

        class AnimalController {
            @route.post()
            save(data: Animal) { return "Hello" }
        }

        it("Should able to set non secured property", async () => {
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .send({ name: "Mimi", deceased: "Yes" })
                .expect(200, "Hello")
        })

        it("Should not able to set secured property", async () => {
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .send({ id:20, createdAt: "2018-1-1", deleted: "YES", name: "Mimi", deceased: "Yes" })
                .expect(401, "Unauthorized to populate parameter paths (data.id, data.createdAt, data.deleted)")
        })

    })

})