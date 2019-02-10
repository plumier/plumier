import { domain, route, authorize } from "@plumier/core";
import { checkParameters } from '@plumier/jwt';
import { reflect } from 'tinspector';

describe("checkParameters", () => {
    describe("Simple Parameters", () => {
        class AnimalController {
            @route.post()
            save(id: string, deceased: boolean, birthday: Date, @authorize.role("Admin") status: "Active" | "Disabled") { }
        }

        it("Should return unauthorized path", () => {
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, ["1", true, new Date(), "Active"], ["User"])
            expect(result).toMatchObject(["status"])
        })

        it("Should return empty array if has authorization", () => {
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, ["1", true, new Date(), "Active"], ["Admin"])
            expect(result).toMatchObject([])
        })

        it("Should work with user has multiple roles", () => {
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, ["1", true, new Date(), "Active"], ["Admin", "Users"])
            expect(result).toMatchObject([])
        })

        it("Should work with user has multiple roles and auth with multiple roles", () => {
            class AnimalController {
                @route.post()
                save(id: string, deceased: boolean, birthday: Date, @authorize.role("Admin", "SuperAdmin") status: "Active" | "Disabled") { }
            }
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, ["1", true, new Date(), "Active"], ["Admin", "Users"])
            expect(result).toMatchObject([])
        })
    })

    describe("Object Parameter", () => {
        @domain()
        class Animal {
            constructor(
                public id: string,
                public deceased: boolean,
                public birthday: Date,
                @authorize.role("Admin")
                public status: "Active" | "Disabled"
            ) { }
        }

        class AnimalController {
            @route.post()
            save(data: Animal) { }
        }

        it("Should return unauthorized path", () => {
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, [new Animal("1", true, new Date(), "Active")], ["Users"])
            expect(result).toMatchObject(["data.status"])
        })

        it("Should return unauthorized path with partial type", () => {
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, [{ status: "Active" }], ["Users"])
            expect(result).toMatchObject(["data.status"])
        })

        it("Should return empty array if has authorization", () => {
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, [new Animal("1", true, new Date(), "Active")], ["Admin"])
            expect(result).toMatchObject([])
        })

        it("Should work with user has multiple roles", () => {
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, [new Animal("1", true, new Date(), "Active")], ["Admin", "Users"])
            expect(result).toMatchObject([])
        })

        it("Should work with user has multiple roles and auth with multiple roles", () => {
            @domain()
            class Animal {
                constructor(
                    public id: string,
                    public deceased: boolean,
                    public birthday: Date,
                    @authorize.role("Admin", "SuperAdmin")
                    public status: "Active" | "Disabled"
                ) { }
            }

            class AnimalController {
                @route.post()
                save(data: Animal) { }
            }
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, [new Animal("1", true, new Date(), "Active")], ["Admin", "Users"])
            expect(result).toMatchObject([])
        })

        it("Should not error if provided undefined array field", () => {
            @domain()
            class Animal {
                constructor(
                    public name?:string,
                    @reflect.array(String)
                    public images?:string[]
                ) { }
            }

            class AnimalController {
                @route.post()
                save(data: Animal) { }
            }
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, [new Animal(undefined, undefined)], ["Admin", "Users"])
            expect(result).toMatchObject([])
        })

        it("Should not error if provided empty object", () => {
            @domain()
            class Animal {
                constructor(
                    public name?:string,
                    public images?:string[]
                ) { }
            }

            class AnimalController {
                @route.post()
                save(data: Animal) { }
            }
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, [{}], ["Admin", "Users"])
            expect(result).toMatchObject([])
        })
    })

    describe("Nested Object Parameter", () => {
        @domain()
        class Animal {
            constructor(
                public id: string,
                @authorize.role("Admin")
                public deceased: boolean,
                public birthday: Date,
                @authorize.role("Admin")
                public status: "Active" | "Disabled"
            ) { }
        }

        @domain()
        class Client {
            constructor(
                public animal: Animal
            ) { }
        }

        class ClientController {
            @route.post()
            save(data: Client) { }
        }

        it("Should return unauthorized path", () => {
            const meta = reflect(ClientController)
            const result = checkParameters([], meta.methods[0].parameters, [new Client(new Animal("1", true, new Date(), "Active"))], ["Users"])
            expect(result).toMatchObject(["data.animal.deceased", "data.animal.status"])
        })

        it("Should return empty array if has authorization", () => {
            const meta = reflect(ClientController)
            const result = checkParameters([], meta.methods[0].parameters, [new Client(new Animal("1", true, new Date(), "Active"))], ["Admin"])
            expect(result).toMatchObject([])
        })

        it("Should work with user has multiple roles", () => {
            const meta = reflect(ClientController)
            const result = checkParameters([], meta.methods[0].parameters, [new Client(new Animal("1", true, new Date(), "Active"))], ["Admin", "Users"])
            expect(result).toMatchObject([])
        })

        it("Should work with user has multiple roles and auth with multiple roles", () => {
            @domain()
            class Animal {
                constructor(
                    public id: string,
                    public deceased: boolean,
                    public birthday: Date,
                    @authorize.role("Admin", "SuperAdmin")
                    public status: "Active" | "Disabled"
                ) { }
            }

            class AnimalController {
                @route.post()
                save(data: Animal) { }
            }
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, [new Client(new Animal("1", true, new Date(), "Active"))], ["Admin", "Users"])
            expect(result).toMatchObject([])
        })
    })


    describe("Object inside Array Parameter", () => {
        @domain()
        class Animal {
            constructor(
                public id: string,
                public deceased: boolean,
                public birthday: Date,
                @authorize.role("Admin")
                public status: "Active" | "Disabled"
            ) { }
        }

        class AnimalController {
            @route.post()
            save(@reflect.array(Animal) data: Animal[]) { }
        }

        it("Should return unauthorized path", () => {
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, [[new Animal("1", true, new Date(), "Active")]], ["Users"])
            expect(result).toMatchObject(["data.0.status"])
        })

        it("Should return empty array if has authorization", () => {
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, [[new Animal("1", true, new Date(), "Active")]], ["Admin"])
            expect(result).toMatchObject([])
        })

        it("Should work with user has multiple roles", () => {
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, [[new Animal("1", true, new Date(), "Active")]], ["Admin", "Users"])
            expect(result).toMatchObject([])
        })

        it("Should work with user has multiple roles and auth with multiple roles", () => {
            @domain()
            class Animal {
                constructor(
                    public id: string,
                    public deceased: boolean,
                    public birthday: Date,
                    @authorize.role("Admin", "SuperAdmin")
                    public status: "Active" | "Disabled"
                ) { }
            }

            class AnimalController {
                @route.post()
                save(data: Animal) { }
            }
            const meta = reflect(AnimalController)
            const result = checkParameters([], meta.methods[0].parameters, [[new Animal("1", true, new Date(), "Active")]], ["Admin", "Users"])
            expect(result).toMatchObject([])
        })
    })
})