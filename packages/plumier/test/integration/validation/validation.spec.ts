import { DefaultDependencyResolver } from "@plumier/core"
import Plumier, {
    AsyncValidatorResult,
    CustomValidator,
    domain,
    RestfulApiFacility,
    route,
    val,
    ValidatorInfo,
    WebApiFacility,
} from "plumier"
import Supertest from "supertest"
import reflect from "tinspector"

import { fixture } from "../../helper"

describe("Validation", () => {
    it("Parameter should be mandatory by default", async () => {
        class AnimalController {
            get(email: string) { }
        }
        const koa = await fixture(AnimalController).initialize()
        const result = await Supertest(koa.callback())
            .get("/animal/get")
            .expect(422)
        expect(result.body).toMatchSnapshot()
    })

    it("Should validate model with correct path", async () => {
        @domain()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean
            ) { }
        }
        class AnimalController {
            @route.post()
            get(model: AnimalModel) { }
        }
        const koa = await fixture(AnimalController).initialize()
        let result = await Supertest(koa.callback())
            .post("/animal/get")
            .send({ id: "123", name: "Mimi" })
            .expect(422)
        expect(result.body).toMatchSnapshot()
    })

    it("Should validate nested model with correct path", async () => {
        @domain()
        class TagModel {
            constructor(public name: string, public id: number) { }
        }
        @domain()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string,
                public tag: TagModel
            ) { }
        }
        class AnimalController {
            @route.post()
            get(model: AnimalModel) { }
        }
        const koa = await fixture(AnimalController).initialize()
        let result = await Supertest(koa.callback())
            .post("/animal/get")
            .send({ id: "123", name: "Mimi", tag: { name: "The Tag" } })
            .expect(422)
        expect(result.body).toMatchSnapshot()
    })

    it("Should validate parameter", async () => {
        class AnimalController {
            get(@val.email() email: string) { }
        }
        const koa = await fixture(AnimalController).initialize()
        const result = await Supertest(koa.callback())
            .get("/animal/get?email=hello")
            .expect(422)
        expect(result.body).toMatchSnapshot()
    })

    it("Should skip optional validation if provided undefined", async () => {
        class AnimalController {
            get(@val.optional() @val.email() email: string) { }
        }
        const koa = await fixture(AnimalController).initialize()
        const result = await Supertest(koa.callback())
            .get("/animal/get")
            .expect(200)
    })

    it("Should validate parameter properly", async () => {
        class AnimalController {
            get(@val.email() email: string) { }
        }
        const koa = await fixture(AnimalController).initialize()
        const result = await Supertest(koa.callback())
            .get("/animal/get?email=m.ketut@gmail.com")
            .expect(200)
    })

    it("Should optionally check on partial validation", async () => {
        @domain()
        class AnimalModel {
            constructor(
                public id: number,
                public name: string,
                public deceased: boolean
            ) { }
        }
        class AnimalController {
            @route.post()
            get(@val.partial(AnimalModel) model: Partial<AnimalModel>) {
                expect(typeof model.id).toBe("number")
                expect(typeof model.deceased).toBe("boolean")
            }
        }
        const koa = await fixture(AnimalController).initialize()
        let result = await Supertest(koa.callback())
            .post("/animal/get")
            .send({ id: "123", deceased: "True" })
            .expect(200)
    })

})

describe("Error handling", () => {
    function customValidator() {
        return val.custom(x => { throw new Error("ERROR") })
    }
    it("Should provide correct information when error inside custom validator", async () => {
        const hook = jest.fn()
        class AnimalController {
            get(@customValidator() email: string) { }
        }
        const koa = await fixture(AnimalController).initialize()
        koa.on("error", e => {
            hook(e)
        })
        const result = await Supertest(koa.callback())
            .get("/animal/get?email=hello")
            .expect(500)
        expect(hook.mock.calls[0][0].stack).toContain("validation.spec")
    })
})

describe("Decouple Validation Logic", () => {
    @domain()
    class Person {
        constructor(
            @val.custom("18+only")
            public age: number
        ) { }
    }
    class PersonController {
        @route.post()
        save(data: Person) { }
    }
    const resolver = new DefaultDependencyResolver()

    @resolver.register("18+only")
    class AgeValidator implements CustomValidator {
        validate(value: any) {
            if (parseInt(value) <= 18)
                return "Only 18+ allowed"
        }
    }


    it("Should validate using decouple logic from setting", async () => {
        const koa = await fixture(PersonController, { dependencyResolver: resolver }).initialize()
        const result = await Supertest(koa.callback())
            .post("/person/save")
            .send({ age: 9 })
            .expect(422)
        expect(result.body).toMatchSnapshot()
    })

    it("Should validate using decouple logic from WebApiFacility", async () => {
        const koa = await new Plumier()
            .set(new WebApiFacility({ dependencyResolver: resolver, controller: PersonController }))
            .set({ mode: "production" })
            .initialize()
        const result = await Supertest(koa.callback())
            .post("/person/save")
            .send({ age: 9 })
            .expect(422)
        expect(result.body).toMatchSnapshot()
    })

    it("Should validate using decouple logic from RestfulApiFacility", async () => {
        const koa = await new Plumier()
            .set(new RestfulApiFacility({ dependencyResolver: resolver, controller: PersonController }))
            .set({ mode: "production" })
            .initialize()
        const result = await Supertest(koa.callback())
            .post("/person/save")
            .send({ age: 9 })
            .expect(422)
        expect(result.body).toMatchSnapshot()
    })
})

describe("Custom Validation", () => {

    it("Should provided correct information for custom validation", async () => {
        async function customValidator(val: any, info: ValidatorInfo) {
            expect(info.name).toBe("data")
            expect(info.parent).toBeUndefined()
            expect(info.ctx.route).toMatchSnapshot()
            return undefined
        }
        class UserController {
            @route.post()
            save(@val.custom(customValidator) data: string) { }
        }
        const koa = await fixture(UserController).initialize()
        await Supertest(koa.callback())
            .post("/user/save")
            .send({ data: "abc" })
            .expect(200)
    })

    it("Should able to use sync function as custom validator", async () => {
        class UserController {
            @route.post()
            save(@val.custom(val => val < 18 ? "Must greater than 18" : undefined) data: number) { }
        }
        const koa = await fixture(UserController).initialize()
        const { body } = await Supertest(koa.callback())
            .post("/user/save")
            .send({ data: 12 })
            .expect(422)
        expect(body).toMatchSnapshot()
    })

    it("Should able to use class based custom validator", async () => {
        class AgeValidator implements CustomValidator {
            validate(val: any) {
                if (val < 18)
                    return "Must greater than 18"
            }
        }
        class UserController {
            @route.post()
            save(@val.custom(new AgeValidator()) data: number) { }
        }
        const koa = await fixture(UserController).initialize()
        const { body } = await Supertest(koa.callback())
            .post("/user/save")
            .send({ data: 12 })
            .expect(422)
        expect(body).toMatchSnapshot()
    })

    it("Should able to return AsyncValidatorResult from sync validation", async () => {
        class UserController {
            @route.post()
            save(@val.custom(v => v < 18 ? val.result("other", "Must greater than 18") : undefined) data: number) { }
        }
        const koa = await fixture(UserController).initialize()
        const { body } = await Supertest(koa.callback())
            .post("/user/save")
            .send({ data: 12 })
            .expect(422)
        expect(body).toMatchSnapshot()
    })

    it("Should able to return AsyncValidatorResult with multiple messages", async () => {
        class UserController {
            @route.post()
            save(@val.custom(v => v < 18 ? val.result("other", ["Must greater", "Than 18"]) : undefined) data: number) { }
        }
        const koa = await fixture(UserController).initialize()
        const { body } = await Supertest(koa.callback())
            .post("/user/save")
            .send({ data: 12 })
            .expect(422)
        expect(body).toMatchSnapshot()
    })


    it("Should able to use async function as custom validator", async () => {
        class UserController {
            @route.post()
            save(@val.custom(async val => val < 18 ? "Must greater than 18" : undefined) data: number) { }
        }
        const koa = await fixture(UserController).initialize()
        const { body } = await Supertest(koa.callback())
            .post("/user/save")
            .send({ data: 12 })
            .expect(422)
        expect(body).toMatchSnapshot()
    })

    it("Should provide parent value information", async () => {
        @domain()
        class ClientModel {
            constructor(
                public password: string,
                @val.custom(async (val, info) => {
                    const pwd = (info.parent!.value as ClientModel).password
                    return val !== pwd ? "Password doesn't match" : undefined
                })
                public confirmPassword: string
            ) { }
        }
        class UserController {
            @route.post()
            save(data: ClientModel) { }
        }

        const koa = await fixture(UserController).initialize()
        const result = await Supertest(koa.callback())
            .post("/user/save")
            .send({ password: "abcde", confirmPassword: "efghi" })
            .expect(422)
        expect(result.body).toMatchSnapshot()
    })

    it("Should able to combine TypedConverter validator and custom validator", async () => {
        function longerThanTwenty() {
            return val.custom(async x => x.length > 20 ? undefined : "String must be longer than 20")
        }
        @reflect.parameterProperties()
        class EmailOnly {
            constructor(
                @val.email()
                @longerThanTwenty()
                public email: string
            ) { }
        }
        class UserController {
            @route.post()
            save(data: EmailOnly) { }
        }

        const koa = await fixture(UserController).initialize()
        const result = await Supertest(koa.callback())
            .post("/user/save")
            .send({ email: "lorem ipsum" })
            .expect(422)
        expect(result.body).toMatchSnapshot()
    })

    it("Should validate using decouple logic", async () => {
        const registry = new DefaultDependencyResolver()

        @registry.register("18+only")
        class AgeValidator implements CustomValidator {
            validate(value: any, info: ValidatorInfo): string | AsyncValidatorResult[] | Promise<string | AsyncValidatorResult[] | undefined> | undefined {
                if (parseInt(value) <= 18)
                    return "Only 18+ allowed"
            }
        }

        @reflect.parameterProperties()
        class EmailOnly {
            constructor(
                @val.custom("18+only")
                public age: number
            ) { }
        }

        class UserController {
            @route.post()
            save(data: EmailOnly) { }
        }

        const koa = await fixture(UserController)
            .set({ dependencyResolver: registry })
            .initialize()
        const result = await Supertest(koa.callback())
            .post("/user/save")
            .send({ age: "12" })
            .expect(422)
        await Supertest(koa.callback())
            .post("/user/save")
            .send({ age: "20" })
            .expect(200)
        expect(result.body).toMatchSnapshot()
    })

    it("Should throw proper error if no validator store provided", async () => {
        function only18Plus() {
            return val.custom("18+only")
        }
        @reflect.parameterProperties()
        class EmailOnly {
            constructor(
                @only18Plus()
                public age: number
            ) { }
        }
        class UserController {
            @route.post()
            save(data: EmailOnly) { }
        }

        const koa = await fixture(UserController).initialize()
        koa.on("error", () => { })
        await Supertest(koa.callback())
            .post("/user/save")
            .send({ age: "12" })
            .expect(500)
    })

    it("Should validate using custom validation", async () => {
        @domain()
        class ClientModel {
            constructor(
                public password: string,
                @val.custom(async (val, info) => {
                    const pwd = (info.ctx.request.body as ClientModel).password
                    return val !== pwd ? "Password doesn't match" : undefined
                })
                public confirmPassword: string
            ) { }
        }
        class UserController {
            @route.post()
            save(data: ClientModel) { }
        }

        const koa = await fixture(UserController).initialize()
        const result = await Supertest(koa.callback())
            .post("/user/save")
            .send({ password: "abcde", confirmPassword: "efghi" })
            .expect(422)
        expect(result.body).toMatchSnapshot()
    })

    it("Should be able to validate class and return several validation result", async () => {
        function checkConfirmPassword() {
            return val.custom( x => {
                if(x.password !== x.confirmPassword)
                    return val.result("confirmPassword", "Password is not the same")
            })
        }
        @domain()
        class User {
            constructor(
                public password: string,
                public confirmPassword: string
            ) { }
        }
        class UsersController {
            @route.post()
            get(@checkConfirmPassword() model: User) { }
        }
        const koa = await fixture(UsersController).initialize()
        let result = await Supertest(koa.callback())
            .post("/users/get")
            .send({ password: "111111", confirmPassword: "2222222" })
            .expect(422)
        expect(result.body).toMatchSnapshot()
    })

    it("Should be able to validate class from the class decorator", async () => {
        function checkConfirmPassword() {
            return val.custom( x => {
                if(x.password !== x.confirmPassword)
                    return val.result("confirmPassword", "Password is not the same")
            })
        }
        @domain()
        @checkConfirmPassword()
        class User {
            constructor(
                public password: string,
                public confirmPassword: string
            ) { }
        }
        class UsersController {
            @route.post()
            get(model: User) { }
        }
        const koa = await fixture(UsersController).initialize()
        let result = await Supertest(koa.callback())
            .post("/users/get")
            .send({ password: "111111", confirmPassword: "2222222" })
            .expect(422)
        expect(result.body).toMatchSnapshot()
    })
})