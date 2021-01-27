import { Class, DependencyResolver, domain, route, Middleware, Invocation, response, ActionResult, Authorizer, AuthorizationContext, CustomValidator, authorize, val, middleware } from "@plumier/core"
import Plumier, { WebApiFacility } from "plumier"

import { Container, inject } from "./ioc-container"
import supertest = require('supertest')
import { JwtAuthFacility } from '@plumier/jwt'
import { sign } from 'jsonwebtoken'

@domain()
class Animal {
    constructor(
        public name: string,
        public dateOfBirth: string
    ) { }
}

interface AnimalRepository {
    save(animal: Animal): any
    get(id: string): Animal
    authorize(user: any): boolean
    validate(val: any): string
}

class AnimalRepositoryImpl implements AnimalRepository {
    save(animal: Animal) {
        return { id: 123 }
    }

    get(id: string) {
        return <Animal>{ name: "Mimi", dateOfBirth: '2002-12-4' }
    }

    authorize(user: any) {
        return user && user.role === "Admin"
    }

    validate(val: any) {
        return "Not valid"
    }
}


class AnimalMiddleware implements Middleware {
    constructor(@inject.name("repository") private repository: AnimalRepository) { }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        return response.json(this.repository.get("123"))
    }
}

// class AnimalAuthorizer implements Authorizer {
//     constructor(@inject.name("repository") private repository: AnimalRepository) { }

//     authorize({ user }: AuthorizationContext) {
//         return this.repository.authorize(user)
//     }
// }

class AnimalValidator implements CustomValidator {
    constructor(@inject.name("repository") private repository: AnimalRepository) { }
    validate(val: any) {
        return this.repository.validate(val)
    }
}

class CustomResolver implements DependencyResolver {
    readonly kernel: Container
    constructor() {
        this.kernel = new Container()
        this.kernel.register("repository").asType(AnimalRepositoryImpl)
        this.kernel.register("middleware").asType(AnimalMiddleware)
        this.kernel.register("validator").asType(AnimalValidator)
        //this.kernel.register("authorizer").asType(AnimalAuthorizer)
        this.kernel.register(AnimalsController)
    }

    resolve(type: string | symbol | Class) {
        //MyOwnIoCContainer doesn't supported symbol, Inversify does
        if (typeof type === "symbol") throw new Error("IoC Container doesn't supported symbol")
        return this.kernel.resolve(type)
    }
}


@authorize.route("Public")
class AnimalsController {
    constructor(@inject.name("repository") private repository: AnimalRepository) { }

    @route.post()
    save(animal: Animal) {
        return this.repository.save(animal)
    }

    // @authorize.custom("authorizer", { access: "route" })
    // secret() {
    //     return { secret: "secret" }
    // }

    @route.post()
    validate(@val.custom("validator") data: any) {
        return { data: "Hello" }
    }

    @middleware.use("middleware")
    middleware() {
        return { data: "Hello" }
    }
}

const secret = "secret"
const userToken = sign({ userId: 123, role: "User" }, secret)
const adminToken = sign({ userId: 123, role: "Admin" }, secret)

const plumier = new Plumier()
    .set({ mode: "production" })
    .set(new WebApiFacility({ dependencyResolver: new CustomResolver(), controller: AnimalsController }))
    .set(new JwtAuthFacility({ secret: secret }))

describe("Custom Dependency Resolver", () => {
    it("Should able to resolve controller's dependencies", async () => {
        const koa = await plumier.initialize()
        await supertest(koa.callback())
            .post("/animals/save")
            .send({ name: "Mimi", dateOfBirth: '2001-12-4' })
            .expect(200, { id: 123 })
    })

    it("Should able to resolve middleware's dependencies", async () => {
        const koa = await plumier.initialize()
        await supertest(koa.callback())
            .get("/animals/middleware")
            .expect(200, { name: "Mimi", dateOfBirth: '2002-12-4' })
    })

    // it("Should able to resolve authorizers dependencies", async () => {
    //     const koa = await plumier.initialize()
    //     await supertest(koa.callback())
    //         .get("/animals/secret")
    //         .expect(403)
    //     await supertest(koa.callback())
    //         .get("/animals/secret")
    //         .set("Authorization", `Bearer ${userToken}`)
    //         .expect(401)
    //     await supertest(koa.callback())
    //         .get("/animals/secret")
    //         .set("Authorization", `Bearer ${adminToken}`)
    //         .expect(200, { secret: "secret" })
    // })

    it("Should able to resolve validator's dependencies", async () => {
        const koa = await plumier.initialize()
        const { body } = await supertest(koa.callback())
            .post("/animals/validate")
            .send({ data: "test" })
            .expect(422)
        expect(body).toMatchObject({ status: 422, message: [{ path: ["data"], messages: ["Not valid"] }] })
    })
})