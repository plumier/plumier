import {
    authorize,
    bind,
    Configuration,
    DefaultFacility,
    entity,
    filterConverters,
    FilterEntity,
    OneToManyRepository,
    PlumierApplication,
    RepoBaseControllerGeneric,
    RepoBaseOneToManyControllerGeneric,
    Repository,
    route,
} from "@plumier/core"
import { JwtAuthFacility } from '@plumier/jwt'
import { sign } from 'jsonwebtoken'
import Plumier, { ControllerFacility, ControllerFacilityOption, domain, WebApiFacility } from "plumier"
import supertest from "supertest"
import { generic, noop } from "@plumier/reflect"

class MockRepo<T> implements Repository<T>{
    constructor(private fn: jest.Mock) { }
    async count(query?: FilterEntity<T>): Promise<number> {
        this.fn(query)
        return 0
    }
    async find(offset: number, limit: number, query: FilterEntity<T>): Promise<T[]> {
        this.fn(offset, limit, query)
        return []
    }
    async insert(data: Partial<T>) {
        this.fn(data)
        return { id: 123 } as any
    }
    async findById(id: any): Promise<T | undefined> {
        this.fn(id)
        return {} as any
    }
    async update(id: any, data: Partial<T>) {
        this.fn(id, data)
        return { id } as any
    }
    async delete(id: any) {
        this.fn(id)
        return { id } as any
    }
}

class MockOneToManyRepo<P, T> implements OneToManyRepository<P, T>{
    constructor(private fn: jest.Mock) { }
    async count(pid: any, query?: FilterEntity<T>): Promise<number> {
        this.fn(query)
        return 0
    }
    async find(pid: any, offset: number, limit: number, query: FilterEntity<T>): Promise<T[]> {
        this.fn(pid, offset, limit, query)
        return []
    }
    async findParentById(id: any): Promise<P | undefined> {
        return {} as any
    }
    async insert(pid: any, data: Partial<T>) {
        this.fn(data)
        return { id: 123 } as any
    }
    async findById(id: any): Promise<T | undefined> {
        this.fn(id)
        return {} as any
    }
    async update(id: any, data: Partial<T>) {
        this.fn(id, data)
        return { id } as any
    }
    async delete(id: any) {
        this.fn(id)
        return { id } as any
    }
}

describe("Filter Parser", () => {
    const fn = jest.fn()
    @generic.template("T", "TID")
    @generic.type("T", "TID")
    class MyControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
        constructor() { super(fac => new MockRepo<T>(fn)) }
    }
    @generic.template("P", "T", "PID", "TID")
    @generic.type("P", "T", "PID", "TID")
    class MyOneToManyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID>{
        constructor() { super(fac => new MockOneToManyRepo<P, T>(fn)) }
    }
    class FilterConverterFacility extends DefaultFacility {
        setup(app: Readonly<PlumierApplication>) {
            app.set({ typeConverterVisitors: [...filterConverters] })
        }
    }
    function createApp(opt: ControllerFacilityOption, config?: Partial<Configuration>) {
        return new Plumier()
            .set({ mode: "production", ...config })
            .set(new WebApiFacility())
            .set(new ControllerFacility(opt))
            .set(new FilterConverterFacility())
            .set({ genericController: [MyControllerGeneric, MyOneToManyControllerGeneric] })
    }
    beforeEach(() => fn.mockClear())
    it("Should not allow non authorized filter", async () => {
        @route.controller()
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id:number,
                public name: string,
                public age: number
            ) { }
        }
        const app = await createApp({ controller: User }).initialize()
        const { body } = await supertest(app.callback())
            .get("/user?filter[name]=abcd")
            .expect(422)
        expect(body).toMatchSnapshot()
    })
    it("Should not allow non authorized filter multiple", async () => {
        @route.controller()
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id:number,
                public name: string,
                public age: number
            ) { }
        }
        const app = await createApp({ controller: User }).initialize()
        const { body } = await supertest(app.callback())
            .get("/user?filter[name]=abcd&filter[age]=2")
            .expect(422)
        expect(body).toMatchSnapshot()
    })
    it("Should not not conflict with other authorization", async () => {
        const user = sign({ userId: 123, role: "User" }, "lorem")
        @route.controller()
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id:number,
                @authorize.write("Admin")
                @authorize.filter()
                public name: string,
                public age: number
            ) { }
        }
        const app = await createApp({ controller: User })
            .set(new JwtAuthFacility({ secret: "lorem" }))
            .initialize()
        await supertest(app.callback())
            .get("/user?filter[name]=abcd")
            .set("Authorization", `Bearer ${user}`)
            .expect(200)
    })
    it("Should not conflict with @bind", async () => {
        const user = sign({ userId: 123, role: "User" }, "lorem")
        class LoginUser {
            @noop()
            userId: number
            @noop()
            role: string
        }
        class UserController {
            @route.get("")
            get(@bind.user() user: LoginUser) {
                return user
            }
        }
        const app = await createApp({ controller: UserController })
            .set(new JwtAuthFacility({ secret: "lorem" }))
            .initialize()
        const { body } = await supertest(app.callback())
            .get("/user")
            .set("Authorization", `Bearer ${user}`)
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    describe("Range Filter", () => {
        it("Should parse number range filter properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    @authorize.filter()
                    public age: number,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get("/user?filter[age]=1...3")
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should not allow data type other than number and date", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public name: string,
                    public age: number,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            const { body } = await supertest(app.callback())
                .get("/user?filter[name]=1...3")
                .expect(422)
            expect(body).toMatchSnapshot()
        })
        it("Should validate number value properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public age: number,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            const { body } = await supertest(app.callback())
                .get("/user?filter[age]=lorem...3")
                .expect(422)
            expect(body).toMatchSnapshot()
        })
        it("Should validate right hand number value properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public age: number,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            const { body } = await supertest(app.callback())
                .get("/user?filter[age]=1...lorem")
                .expect(422)
            expect(body).toMatchSnapshot()
        })
        it("Should parse date range filter properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public birthDate: Date,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            const date = new Date().toDateString()
            await supertest(app.callback())
                .get(`/user?filter[birthDate]=${date}...${date}`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should parse iso date range filter properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public birthDate: Date,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            const date = new Date().toISOString()
            await supertest(app.callback())
                .get(`/user?filter[birthDate]=${date}...${date}`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should validate date value properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public birthDate: Date,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            const { body } = await supertest(app.callback())
                .get("/user?filter[birthDate]=lorem...2020-2-1")
                .expect(422)
            expect(body).toMatchSnapshot()
        })
        it("Should validate right hand date value properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public birthDate: Date,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            const { body } = await supertest(app.callback())
                .get("/user?filter[birthDate]=2020-1-1...lorem")
                .expect(422)
            expect(body).toMatchSnapshot()
        })
    })
    describe("Partial Filter", () => {
        it("Should parse partial filter at the end properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public name: string,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[name]=mimi*`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should parse partial filter at the start properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public name: string,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[name]=*mimi`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should parse partial filter at both properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public name: string,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[name]=*mimi*`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should not allowed on type other than string", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public name: Date,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            const { body } = await supertest(app.callback())
                .get(`/user?filter[name]=*mimi*`)
                .expect(422)
            expect(body).toMatchSnapshot()
        })
    })
    describe("Equal Filter", () => {
        it("Should parse equal filter properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public name: string,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[name]=mimi`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should parse equal filter on type number properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public name: number,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[name]=12345`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should able to filter by number with falsy value", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public name: number,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[name]=0`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should able to filter by boolean with falsy value", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public bool: boolean,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[bool]=false`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should parse equal filter on type number properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public name: number,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[name]=12345`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should parse equal filter on type date properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public dob: Date,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            const date = new Date()
            await supertest(app.callback())
                .get(`/user?filter[dob]=${date.toISOString()}`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should parse equal filter on type boolean properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public active: boolean,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[active]=true`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should validate filter properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public name: number,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            const { body } = await supertest(app.callback())
                .get(`/user?filter[name]=lorem`)
                .expect(422)
            expect(body).toMatchSnapshot()
        })
    })
    describe("Conditional Filter", () => {
        it("Should parse gte filter properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public age: number,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[age]=>=3`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should parse lte filter properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public age: number,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[age]=<=3`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should parse lt filter properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public age: number,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[age]=<3`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should parse gt filter properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public age: number,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[age]=>3`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should validate value", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public age: number,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            const { body } = await supertest(app.callback())
                .get(`/user?filter[age]=>=lorem`)
                .expect(422)
            expect(body).toMatchSnapshot()
        })
        it("Should validate type", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public age: string,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            const { body } = await supertest(app.callback())
                .get(`/user?filter[age]=>=lorem`)
                .expect(422)
            expect(body).toMatchSnapshot()
        })
    })
    describe("Not Equal Filter", () => {
        it("Should parse ne filter on string data properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public age: string,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[age]=!3`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should parse ne filter on number properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public age: number,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[age]=!3`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should parse ne filter on date properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public age: Date,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            const date = new Date()
            await supertest(app.callback())
                .get(`/user?filter[age]=!${date.toISOString()}`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should parse ne filter on boolean properly", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @authorize.filter()
                    public age: boolean,
                ) { }
            }
            const app = await createApp({ controller: User }).initialize()
            await supertest(app.callback())
                .get(`/user?filter[age]=!true`)
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
    })
})