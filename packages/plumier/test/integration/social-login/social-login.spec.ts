import axios from "axios"
import faker from "faker"
import Plumier, { WebApiFacility } from "plumier"
import qs from "querystring"
import supertest from "supertest"

import { axiosError, axiosResult, googleProfile } from "./helper"

jest.mock("axios")

function createApp() {
    return new Plumier()
        .set({ mode: "production" })
        .set(new WebApiFacility())
        .initialize()
}

function getParams(path:string){
    const object = qs.parse(path)
    const props = Object.keys(object).filter(x => x !== "redirect_uri")
    return JSON.parse(JSON.stringify(object, props))
}

describe("Social Login Mock Test", () => {
    it("Should return profile properly", async () => {
        (axios.post as jest.Mock).mockReturnValue(axiosResult({ access_token: faker.random.uuid() }));
        (axios.get as jest.Mock).mockReturnValue(axiosResult(googleProfile));
        const app = await createApp()
        const agent = supertest.agent(app.callback())
        const { body } = await agent
            .get(`/google/callback?code=lorem`)
            .expect(200)
        expect(body.status).toBe("Success")
        expect(body.data).toMatchObject(googleProfile)
    })

    it("Should return axios error properly", async () => {
        (axios.post as jest.Mock).mockRejectedValue(axiosError({ error: "invalid auth code" }));
        (axios.get as jest.Mock).mockReturnValue(axiosResult(googleProfile));
        const app = await createApp()
        const agent = supertest.agent(app.callback())
        const { body } = await agent
            .get(`/google/callback?code=lorem`)
            .expect(200)
        expect(body.status).toBe("Failed")
        expect(body.error).toMatchObject({ error: "invalid auth code" })
    })

    it("Should return error properly", async () => {
        (axios.post as jest.Mock).mockRejectedValue(new Error("lorem ipsum"));
        (axios.get as jest.Mock).mockReturnValue(axiosResult(googleProfile));
        const app = await createApp()
        const agent = supertest.agent(app.callback())
        const { body } = await agent
            .get(`/google/callback?code=lorem`)
            .expect(200)
        expect(body.status).toBe("Failed")
        expect(body.error).toMatchObject({ message: "lorem ipsum" })
    })

    it("Should return error if no authorization code provided", async () => {
        (axios.post as jest.Mock).mockReturnValue(axiosResult({ access_token: faker.random.uuid() }));;
        (axios.get as jest.Mock).mockReturnValue(axiosResult(googleProfile));
        const app = await createApp()
        const agent = supertest.agent(app.callback())
        const { body } = await agent
            .get("/google/callback")
            .expect(200)
        expect(body.status).toBe("Failed")
        expect(body.error).toMatchObject({ message: "Authorization code is required" })
    })

    it("Should skip validation", async () => {
        (axios.post as jest.Mock).mockReturnValue(axiosResult({ access_token: faker.random.uuid() }));;
        (axios.get as jest.Mock).mockReturnValue(axiosResult({ ...googleProfile, family_name: undefined }));
        const app = await createApp()
        const agent = supertest.agent(app.callback())
        const { body } = await agent
            .get(`/google/callback?code=lorem`)
            .expect(200)
        expect(body.status).toBe("Success")
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

describe("Social Login Dialogs", () => {

    it("Should return facebook dialog properly", async () => {
        const app = await createApp()
        const resp = await supertest(app.callback())
            .get("/facebook/login")
            .expect(302)
        const parts = resp.get("location").split("?")
        expect(parts[0]).toBe("https://www.facebook.com/v4.0/dialog/oauth")
        expect(getParams(parts[1])).toMatchSnapshot()
    })

    it("Should return google dialog properly", async () => {
        const app = await createApp()
        const resp = await supertest(app.callback())
            .get("/google/login")
            .expect(302)
        const parts = resp.get("location").split("?")
        expect(parts[0]).toBe("https://accounts.google.com/o/oauth2/v2/auth")
        expect(getParams(parts[1])).toMatchSnapshot()
    })

    it("Should return github dialog properly", async () => {
        const app = await createApp()
        const resp = await supertest(app.callback())
            .get("/github/login")
            .expect(302)
        const parts = resp.get("location").split("?")
        expect(parts[0]).toBe("https://github.com/login/oauth/authorize")
        expect(getParams(parts[1])).toMatchSnapshot()
    })

    it("Should return gitlab dialog properly", async () => {
        const app = await createApp()
        const resp = await supertest(app.callback())
            .get("/gitlab/login")
            .expect(302)
        const parts = resp.get("location").split("?")
        expect(parts[0]).toBe("https://gitlab.com/oauth/authorize")
        expect(getParams(parts[1])).toMatchSnapshot()
    })
})