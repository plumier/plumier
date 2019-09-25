import { GoogleProfile } from "@plumier/social-login"
import axios from "axios"
import faker from "faker"
import Plumier, { WebApiFacility } from "plumier"
import supertest from "supertest"

import { axiosResult, googleProfile, axiosError } from "./helper"

jest.mock("axios")

function createApp() {
    return new Plumier()
        .set({ mode: "production" })
        .set(new WebApiFacility())
        .initialize()
}

describe("Social Login Mock Test", () => {
    it("Should return profile properly", async () => {
        (axios.post as jest.Mock).mockReturnValue(axiosResult({ access_token: faker.random.uuid() }));
        (axios.get as jest.Mock).mockReturnValue(axiosResult(googleProfile));
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/google/callback?code=lorem")
            .expect(200)
        expect(body.status).toBe("Success")
        expect(body.data).toMatchObject(googleProfile)
    })

    it("Should return axios error properly", async () => {
        (axios.post as jest.Mock).mockRejectedValue(axiosError({ error: "invalid auth code" }));
        (axios.get as jest.Mock).mockReturnValue(axiosResult(googleProfile));
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/google/callback?code=lorem")
            .expect(200)
        expect(body.status).toBe("Error")
        expect(body.error).toMatchObject({ error: "invalid auth code" })
    })

    it("Should return error properly", async () => {
        (axios.post as jest.Mock).mockRejectedValue(new Error("lorem ipsum"));
        (axios.get as jest.Mock).mockReturnValue(axiosResult(googleProfile));
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/google/callback?code=lorem")
            .expect(200)
        expect(body.status).toBe("Error")
        expect(body.error).toMatchObject({ message: "lorem ipsum" })
    })

    it("Should return error if no authorization code provided", async () => {
        (axios.post as jest.Mock).mockReturnValue(axiosResult({ access_token: faker.random.uuid() }));;
        (axios.get as jest.Mock).mockReturnValue(axiosResult(googleProfile));
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/google/callback")
            .expect(200)
        expect(body.status).toBe("Error")
        expect(body.error).toMatchObject({ message: "Authorization code is required" })
    })

    it("Should return error if fail validation occur", async () => {
        (axios.post as jest.Mock).mockReturnValue(axiosResult({ access_token: faker.random.uuid() }));;
        (axios.get as jest.Mock).mockReturnValue(axiosResult({ ...googleProfile, family_name: undefined }));
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/google/callback?code=lorem")
            .expect(200)
        expect(body.status).toBe("Error")
        expect(body.error).toMatchObject([{ messages: ["Required"], path: ["profile", "data", "family_name"] }])
    })
})

describe("Callback View", () => {
    it("Should able to provide callback view", async () => {
        const app = await createApp()
        const { text } = await supertest(app.callback())
            .get("/view/popup")
            .expect(200)
        expect(text).toMatchSnapshot()
    })
})