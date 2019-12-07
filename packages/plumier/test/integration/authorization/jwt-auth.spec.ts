import { consoleLog, Authorizer, AuthorizeMetadataInfo, DefaultDependencyResolver } from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import { sign } from "jsonwebtoken"
import { authorize, domain, route, val } from "plumier"
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
                .expect(403, { status: 403, message: "Forbidden" })
            await Supertest(app.callback())
                .post("/animal/save")
                .expect(403, { status: 403, message: "Forbidden" })
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
                .use(i => {
                    fn()
                    return i.proceed()
                })
                .initialize()

            await Supertest(app.callback())
                .get("/nohandler")
                .expect(404)
            expect(fn).toBeCalled()
        })

        it("Should allow using multiple @authorize.role() decorators", async () => {
            class AnimalController {
                @authorize.role("superadmin")
                @authorize.role("admin")
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

        it("Should allow authorize using @authorize.public() and @authorize.role() in the same action", async () => {
            class AnimalController {
                @authorize.public()
                @authorize.role("admin")
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

        it("Should able to send token using cookie", async () => {
            class AnimalController {
                @authorize.role("admin")
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("cookie", `Authorization=${ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("cookie", `Authorization=${USER_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(403)
        })

        it("Should able to send token using cookie with custom name", async () => {
            class AnimalController {
                @authorize.role("admin")
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, cookie: "__JWT" }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("cookie", `__JWT=${ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("cookie", `__JWT=${USER_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(403)
        })
    })

    describe("Custom Authorization", () => {
        it("Should able to use @authorize.custom()", async () => {
            class AnimalController {
                @authorize.custom(i => i.role.some(x => x === "admin"))
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
                .expect(401)
        })

        it("Should able to use async @authorize.custom()", async () => {
            class AnimalController {
                @authorize.custom(async i => i.role.some(x => x === "admin"))
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should able to use Class based authorizer", async () => {
            class IsAdmin implements Authorizer {
                authorize(info:AuthorizeMetadataInfo){
                    return info.role.some(x => x === "admin")
                }
            }

            class AnimalController {
                @authorize.custom(new IsAdmin())
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should able to get decorator position in class scope", async () => {
            @authorize.custom((i, pos) => pos === "Class" && i.role.some(x => x === "admin"))
            class AnimalController {
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should able to get decorator position in method scope", async () => {
            class AnimalController {
                @authorize.custom((i, pos) => pos === "Method" && i.role.some(x => x === "admin"))
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should able to get decorator position in parameter scope", async () => {
            class AnimalController {
                get(
                    @authorize.custom((i, pos) => pos === "Parameter" && i.role.some(x => x === "admin"))
                    data: string) { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get?data=123")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should able to get parameter value in parameter scope", async () => {
            class AnimalController {
                get(
                    @authorize.custom(i => i.value === "123" && i.role.some(x => x === "admin"))
                    data: string) { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get?data=123")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should able to get context information", async () => {
            class AnimalController {
                @authorize.custom(i => i.ctx.path === "/animal/get" && i.role.some(x => x === "admin"))
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should able to get cleansed parameter binding information", async () => {
            class AnimalController {
                @authorize.custom(i => {
                    expect(i.ctx.parameters).toMatchObject(["abc", 123, false])
                    return true
                })
                get(str:string, num:number, bool:boolean) { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get?str=abc&num=123&bool=false")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
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
                .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (id, deceased)" })
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

        it("Should throw error if @authorize.public() used for parameter authorization", () => {
            try {
                class AnimalController {
                    @route.post()
                    save(name: string,
                        @authorize.public()
                        id: number | undefined,
                        deceased: boolean | undefined) { return "Hello" }
                }
            }
            catch (e) {
                expect(e.message).toContain("PLUM1008")
            }
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
                .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.id, data.deceased)" })
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
                .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.id, data.deceased)" })

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
                .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.0.id, data.0.deceased)" })
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
                .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.0.id, data.0.deceased)" })
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
                .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.0.id, data.0.deceased)" })
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
                .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.0.id, data.0.deceased)" })
        })
    })

    describe("Inheritance Parameter Authorization", () => {
        @domain()
        class DomainBase {
            constructor(
                @authorize.role("Machine")
                public id: number = 0,

                @authorize.role("Machine")
                public createdAt: Date = new Date(),

                @authorize.role("Machine")
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
                .send({ id: 20, createdAt: "2018-1-1", deleted: "YES", name: "Mimi", deceased: "Yes" })
                .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.id, data.createdAt, data.deleted)" })
        })

    })

    describe("Separate Decorator And Implementation with Object Registry", () => {
        const OTHER_USER_TOKEN = sign({ email: "other-ketut@gmail.com", role: "user" }, SECRET)
        const resolver = new DefaultDependencyResolver()

        @resolver.register("isOwner")
        class OwnerAuthorizer implements Authorizer {
            authorize(info: AuthorizeMetadataInfo) {
                return info.ctx.parameters[0] === info.user.email
            }
        }

        it("Should able to use separate implementation", async () => {
            class AnimalController {
                @authorize.custom("isOwner")
                @route.get()
                save(email: string) { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set({ dependencyResolver: resolver })
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/save?email=ketut@gmail.com")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/save?email=ketut@gmail.com")
                .set("Authorization", `Bearer ${OTHER_USER_TOKEN}`)
                .expect(401, { status: 401, message: "Unauthorized" })
        })
    })

    describe("Analyzer Message", () => {
        it("Should print Authenticated if no decorator applied", async () => {
            class AnimalController {
                get() { }
            }
            consoleLog.startMock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()
            const mock = (console.log as jest.Mock)
            console.log(mock.mock.calls)
            expect(mock.mock.calls[2][0]).toContain("Authenticated")
            consoleLog.clearMock()
        })

        it("Should print Admin if specified in method", async () => {
            class AnimalController {
                @authorize.role("Admin")
                get() { }
            }
            consoleLog.startMock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()
            const mock = (console.log as jest.Mock)
            expect(mock.mock.calls[2][0]).toContain("Admin")
            consoleLog.clearMock()
        })

        it("Should print Admin if specified in class", async () => {
            @authorize.role("Admin")
            class AnimalController {
                get() { }
            }
            consoleLog.startMock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()
            const mock = (console.log as jest.Mock)
            expect(mock.mock.calls[2][0]).toContain("Admin")
            consoleLog.clearMock()
        })

        it("Should print Custom if provided @authorize.custom", async () => {
            class AnimalController {
                @authorize.custom(async i => true)
                get() { }
            }
            consoleLog.startMock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()
            const mock = (console.log as jest.Mock)
            expect(mock.mock.calls[2][0]).toContain("Custom")
            consoleLog.clearMock()
        })

        it("Should print Public if provided in global", async () => {
            class AnimalController {
                get() { }
            }
            consoleLog.startMock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.public() }))
                .initialize()
            const mock = (console.log as jest.Mock)
            expect(mock.mock.calls[2][0]).toContain("Public")
            consoleLog.clearMock()
        })

        it("Should print Admin even if provided in global", async () => {
            class AnimalController {
                @authorize.role("Admin")
                get() { }
            }
            consoleLog.startMock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.public() }))
                .initialize()
            const mock = (console.log as jest.Mock)
            expect(mock.mock.calls[2][0]).toContain("Admin")
            consoleLog.clearMock()
        })

        it("Should print All if provided multiple", async () => {
            class AnimalController {
                @authorize.role("Admin")
                @authorize.role("User")
                get() { }
            }
            consoleLog.startMock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.public() }))
                .initialize()
            const mock = (console.log as jest.Mock)
            expect(mock.mock.calls[2][0]).toContain("User|Admin")
            consoleLog.clearMock()
        })

        it("Should print All if provided by comma", async () => {
            class AnimalController {
                @authorize.role("Admin", "User")
                get() { }
            }
            consoleLog.startMock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.public() }))
                .initialize()
            const mock = (console.log as jest.Mock)
            expect(mock.mock.calls[2][0]).toContain("Admin|User")
            consoleLog.clearMock()
        })

        it("Should print nicely", async () => {
            class AnimalController {
                authenticated() { }
                @authorize.public()
                public() { }
                @authorize.role("Admin")
                admin() { }
                @authorize.role("User")
                user() { }
                @authorize.role("Admin", "User")
                mix() { }
            }
            consoleLog.startMock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET }))
                .initialize()
            const mock = (console.log as jest.Mock)
            const [, ...calls] = mock.mock.calls.map(x => x[0]).filter(x => !!x)
            expect(calls).toEqual([
                '1. AnimalController.authenticated() -> Authenticated GET /animal/authenticated',
                '2. AnimalController.public()        -> Public        GET /animal/public',
                '3. AnimalController.admin()         -> Admin         GET /animal/admin',
                '4. AnimalController.user()          -> User          GET /animal/user',
                '5. AnimalController.mix()           -> Admin|User    GET /animal/mix',
            ])
            consoleLog.clearMock()
        })

        it("Should not print if JwtAuthFacility not installed", async () => {
            class AnimalController {
                authenticated() { }
                @authorize.public()
                public() { }
                @authorize.role("Admin")
                admin() { }
                @authorize.role("User")
                user() { }
                @authorize.role("Admin", "User")
                mix() { }
            }
            consoleLog.startMock()
            await fixture(AnimalController, { mode: "debug" })
                .initialize()
            const mock = (console.log as jest.Mock)
            const [, ...calls] = mock.mock.calls.map(x => x[0]).filter(x => !!x)
            expect(calls).toEqual([
                '1. AnimalController.authenticated() -> GET /animal/authenticated',
                '2. AnimalController.public()        -> GET /animal/public',
                '3. AnimalController.admin()         -> GET /animal/admin',
                '4. AnimalController.user()          -> GET /animal/user',
                '5. AnimalController.mix()           -> GET /animal/mix'
            ])
            consoleLog.clearMock()
        })
    })

})