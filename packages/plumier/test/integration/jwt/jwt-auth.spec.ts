import { route } from "@plumjs/core";
import { fixture } from '../../helper';
import { JwtSecurityFacility, authorize } from '@plumjs/jwt';
import { sign } from 'jsonwebtoken';
import Supertest from "supertest"

const SECRET = "super secret"
const TOKEN = sign({ email: "ketut@gmail.com" }, SECRET)

describe("JwtAuth", () => {
    it("Should secure all routes by return 403 for non login user", async () => {
        class AnimalController {
            get() { return "Hello" }

            @route.post()
            save() { return "Hello" }
        }
        const app = await fixture(AnimalController)
            .set(new JwtSecurityFacility({ secret: SECRET }))
            .initialize()

        await Supertest(app.callback())
            .get("/animal/get")
            .expect(403)
        await Supertest(app.callback())
            .get("/animal/save")
            .expect(403)
    })

    it("Should able to access route decorated with @authorize.public()", async () => {
        class AnimalController {
            @authorize.public()
            get() { return "Hello" }
        }
        const app = await fixture(AnimalController)
            .set(new JwtSecurityFacility({ secret: SECRET }))
            .initialize()

        await Supertest(app.callback())
            .get("/animal/get")
            .expect(200)
    })
})