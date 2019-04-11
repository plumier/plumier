import Plumier, { domain, RestfulApiFacility, route, val, ValidatorStore } from "plumier"
import Supertest from "supertest"

import { fixture } from "../../helper"
import reflect from 'tinspector';
import supertest = require('supertest');
import { ValidatorInfo } from 'core/src/validator';

describe("Validation", () => {
    it("Parameter should be mandatory by default", async () => {
        class AnimalController {
            get(email: string) { }
        }
        const koa = await fixture(AnimalController).initialize()
        const result = await Supertest(koa.callback())
            .get("/animal/get")
            .expect(422, [
                {
                    "messages": ["email is required"],
                    "path": ["email"]
                }])
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
            .expect(422, [
                {
                    "messages": ["model.deceased is required"],
                    "path": ["model", "deceased"]
                }])
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
            .expect(422, [
                {
                    "messages": ["model.tag.id is required"],
                    "path": ["model", "tag", "id"]
                }])
    })

    it("Should validate parameter", async () => {
        class AnimalController {
            get(@val.email() email: string) { }
        }
        const koa = await fixture(AnimalController).initialize()
        const result = await Supertest(koa.callback())
            .get("/animal/get?email=hello")
            .expect(422)
        expect(result.body).toMatchObject([
            {
                "messages": ["Invalid email address"],
                "path": ["email"]
            }])
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
    function only18Plus() {
        return val.custom("18+only")
    }
    @domain()
    class Person {
        constructor(
            @only18Plus()
            public age: number
        ) { }
    }
    class PersonController {
        @route.post()
        save(data: Person) { }
    }
    const validators: ValidatorStore = {
        "18+only": async val => parseInt(val) > 18 ? undefined : "Only 18+ allowed"
    }

    it("Should validate using decouple logic from setting", async () => {
        const koa = await fixture(PersonController, { validators }).initialize()
        const result = await Supertest(koa.callback())
            .post("/person/save")
            .send({ age: 9 })
            .expect(422)
        expect(result.body).toMatchObject([
            {
                messages: ["Only 18+ allowed"],
                path: ["data", "age"]
            }])
    })

    it("Should validate using decouple logic from WebApiFacility", async () => {
        const koa = await new Plumier()
            .set(new RestfulApiFacility({ validators, controller: PersonController }))
            .set({ mode: "production" })
            .initialize()
        const result = await Supertest(koa.callback())
            .post("/person/save")
            .send({ age: 9 })
            .expect(422)
        expect(result.body).toMatchObject([
            {
                messages: ["Only 18+ allowed"],
                path: ["data", "age"]
            }])
    })

    it("Should validate using decouple logic from RestfulApiFacility", async () => {
        const koa = await new Plumier()
            .set(new RestfulApiFacility({ validators, controller: PersonController }))
            .set({ mode: "production" })
            .initialize()
        const result = await Supertest(koa.callback())
            .post("/person/save")
            .send({ age: 9 })
            .expect(422)
        expect(result.body).toMatchObject([
            {
                messages: ["Only 18+ allowed"],
                path: ["data", "age"]
            }])
    })
})



// describe("Object Validation", () => {

//     it("Should validate object with parameter properties", async () => {
//         @domain()
//         class ClientModel {
//             constructor(
//                 @val.email()
//                 public email: string,
//                 @val.email()
//                 public secondaryEmail: string
//             ) { }
//         }
//         const result = await validateMe(new ClientModel("kitty", "doggy"))
//         expect(result).toMatchObject([
//             { path: ["email"] },
//             { path: ["secondaryEmail"] }
//         ])
//     })

//     it("Should validate object with common property", async () => {
//         @domain()
//         class ClientModel {
//             @val.email()
//             public email: string = "kitty"
//             @val.email()
//             public secondaryEmail: string = "doggy"
//         }
//         const result = await validateMe(new ClientModel())
//         expect(result).toMatchObject([
//             { path: ["email"] },
//             { path: ["secondaryEmail"] }
//         ])
//     })

//     it("Should validate object with getter property", async () => {
//         @domain()
//         class ClientModel {
//             @val.email()
//             get email(): string { return "kitty" }
//             @val.email()
//             get secondaryEmail(): string { return "doggy" }
//         }
//         const result = await validateMe(new ClientModel())
//         expect(result).toMatchObject([
//             { path: ["email"] },
//             { path: ["secondaryEmail"] }
//         ])
//     })

//     it("Should validate nested object", async () => {
//         @domain()
//         class CreditCardModel {
//             constructor(
//                 @val.creditCard()
//                 public creditCard: string,
//             ) { }
//         }
//         @domain()
//         class ClientModel {
//             constructor(
//                 @val.email()
//                 public email: string,
//                 @val.email()
//                 public secondaryEmail: string,
//                 public spouse: CreditCardModel
//             ) { }
//         }
//         const result = await validateMe(new ClientModel("kitty", "doggy", new CreditCardModel("kitty")))
//         expect(result).toMatchObject([
//             { path: ["email"] },
//             { path: ["secondaryEmail"] },
//             { path: ["spouse", "creditCard"] }
//         ])
//     })
// })

// describe("Array Validation", () => {
//     it("Should validate object inside array", async () => {
//         @domain()
//         class Dummy {
//             constructor(
//                 @val.email()
//                 public email: string,
//             ) { }
//         }
//         const result = await validateArray([new Dummy("support@gmail.com"), new Dummy("noreply@gmail.com"), new Dummy("kitty")], [], {} as any)
//         expect(result).toMatchObject([
//             { path: ["2", "email"] }
//         ])
//     })
//     it("Should validate nested array inside object", async () => {
//         @domain()
//         class Empty {
//             constructor(
//                 public dummies: Dummy[],
//             ) { }
//         }
//         @domain()
//         class Dummy {
//             constructor(
//                 @val.email()
//                 public email: string,
//             ) { }
//         }
//         const dummies = [new Dummy("support@gmail.com"), new Dummy("noreply@gmail.com"), new Dummy("kitty")]
//         const result = await validateArray([new Empty(dummies)], [], {} as any)
//         expect(result).toMatchObject([
//             { path: ["0", "dummies", "2", "email"] }
//         ])
//     })
// })

// describe("Durability", () => {
//     it("Should treat property as required except @optional() defined", async () => {
//         @domain()
//         class ClientModel {
//             constructor(
//                 @val.email()
//                 public email?: string | null | undefined,
//             ) { }
//         }
//         expect((await validateMe(new ClientModel()))).toMatchObject([{ "messages": ["Required"] }])
//         expect((await validateMe(new ClientModel("")))).toMatchObject([{ "messages": ["Required"] }])
//         expect((await validateMe(new ClientModel("abc")))).toMatchObject([{ "messages": ["Invalid email address"] }])
//         expect((await validateMe(new ClientModel("support@gmail.com")))).toEqual([])
//     })

//     it("Should skip required if @option() is provided", async () => {
//         @domain()
//         class ClientModel {
//             constructor(
//                 @val.optional()
//                 @val.email()
//                 public email?: string | null | undefined,
//             ) { }
//         }
//         expect((await validateMe(new ClientModel())).length).toBe(0)
//         expect((await validateMe(new ClientModel(""))).length).toBe(0)
//         expect((await validateMe(new ClientModel(null))).length).toBe(0)
//         expect((await validateMe(new ClientModel("abc")))).toMatchObject([{ "messages": ["Invalid email address"] }])
//     })

//     it("Should not error if provided boolean", async () => {
//         @domain()
//         class ClientModel {
//             constructor(
//                 @val.email()
//                 public hasEmail: boolean,
//             ) { }
//         }
//         const result = await validateMe(new ClientModel(false))
//         expect(result).toMatchObject([{
//             path: ["hasEmail"]
//         }])
//     })
//     it("Should not error if provided number", async () => {
//         @domain()
//         class ClientModel {
//             constructor(
//                 @val.email()
//                 public age: number,
//             ) { }
//         }
//         const result = await validateMe(new ClientModel(50))
//         expect(result).toMatchObject([{
//             path: ["age"]
//         }])
//     })
//     it("Should not error if provided function", async () => {
//         @domain()
//         class ClientModel {
//             constructor(
//                 @val.email()
//                 public fn: () => void,
//             ) { }
//         }
//         const result = await validateMe(new ClientModel(() => { }))
//         expect(result).toMatchObject([{
//             path: ["fn"]
//         }])
//     })

// })

// describe("Partial Validation", () => {
//     class ClientModel {
//         constructor(
//             public name?: string,
//             @val.email()
//             public email?: string,
//         ) { }
//     }
//     it("Should called without error", () => {
//         const result = val.partial(ClientModel)
//         expect(result).not.toBeNull()
//     })
//     it("Should skip required validation on partial type", async () => {
//         const result = await validate(new ClientModel(), [<TypeDecorator>{ kind: "Override", type: ClientModel, info: "Partial" }], [], {} as any)
//         expect(result).toEqual([])
//     })
// })


describe("Custom Validation", () => {

    it("Should provided correct information for custom validation", async () => {
        async function customValidator(val:any, info:ValidatorInfo){
            expect(info.name).toBe("data")
            expect(info.parent).toBeUndefined()
            expect(info.route).toMatchSnapshot()
            return undefined
        }
        class UserController {
            @route.post()
            save(@val.custom(customValidator) data: string) { }
        }
        const koa = await fixture(UserController).initialize()
        await supertest(koa.callback())
            .post("/user/save")
            .send({data: "abc"})
            .expect(200)
    })


    it("Should validate using decouple logic", async () => {
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

        const koa = await fixture(UserController, {
            validators: { "18+only": async val => parseInt(val) > 18 ? undefined : "Only 18+ allowed" }
        }).initialize()
        await supertest(koa.callback())
            .post("/user/save")
            .send({ age: "12" })
            .expect(422, [{ path: ["data", "age"], messages: ["Only 18+ allowed"] }])
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
        await supertest(koa.callback())
            .post("/user/save")
            .send({ password: "abcde", confirmPassword: "efghi" })
            .expect(422, [{ path: ["data", "confirmPassword"], messages: ["Password doesn't match"] }])
    })

    it("Should able to skip validation", async () => {
        @domain()
        class ClientModel {
            constructor(
                @val.skip()
                @val.email()
                public email: string,
            ) { }
        }
        class UserController {
            @route.post()
            save(data: ClientModel) { }
        }

        const koa = await fixture(UserController).initialize()
        await supertest(koa.callback())
            .post("/user/save")
            .send({ email: "lorem ipsum" })
            .expect(200)
    })
})