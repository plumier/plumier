import { FacebookLoginStatus, GitHubLoginStatus, GitLabLoginStatus, GoogleLoginStatus } from "@plumier/social-login"
import { Server } from "http"
import Plumier, { WebApiFacility } from "plumier"
import puppeteer, { Browser } from "puppeteer"

import { fb, github, gitlab, google } from "./config"

describe("Social Login Using Robot", () => {
    let server: Server;
    let browser: Browser

    beforeAll(async () => {
        const callback = await new Plumier()
            .set({ mode: "production" })
            .set(new WebApiFacility())
            .initialize()
        server = callback.listen(8000)
        browser = await puppeteer.launch({ headless: false })
    })

    afterAll(async () => {
        server.close()
        await browser.close()
    })

    it.only("Should able to login with google", async () => {
        const page = (await browser.pages())[0]
        await page.goto("http://localhost:8000/google/login", { waitUntil: "networkidle0" })
        await page.type("input[name=identifier]", google.email)
        await page.click("#identifierNext")
        await page.waitFor(1000)
        await page.type("input[name=password]", google.password)
        await page.click("#passwordNext")
        await page.waitForNavigation({waitUntil: "networkidle0"})
        const json: GoogleLoginStatus = await page.evaluate(() => JSON.parse(document.querySelector("body")!.innerText))
        expect(json.data!.id).toBe("115265112982540663763")
        expect(json.data!.name).toBe("Plumier Tester")
    }, 1000000)

    it("Should able to login with facebook", async () => {
        const page = (await browser.pages())[0]
        await page.goto("http://localhost:8000/facebook/login")
        await page.type("input[name=email]", fb.email)
        await page.type("input[name=pass]", fb.password)
        await page.click("button[name=login]")
        const json: FacebookLoginStatus = await page.evaluate(() => JSON.parse(document.querySelector("body")!.innerText))
        expect(json.data!.id).toBe("108088337240625")
        expect(json.data!.name).toBe("Plumier Sudarsa")
    }, 1000000)

    it("Should able to login with github", async () => {
        const page = (await browser.pages())[0]
        await page.goto("http://localhost:8000/github/login")
        await page.type("input[name=login]", github.email)
        await page.type("input[name=password]", github.password)
        await page.click("input[name=commit]")
        await page.waitForNavigation({waitUntil: "networkidle2"})
        const json: GitHubLoginStatus = await page.evaluate(() => JSON.parse(document.querySelector("body")!.innerText))
        expect(json.data!.id).toBe(55014506)
        expect(json.data!.name).toBe("Plumier Tester")
    }, 1000000)

    it("Should able to login with gitlab", async () => {
        const page = (await browser.pages())[0]
        await page.goto("http://localhost:8000/gitlab/login")
        await page.type("#user_login", gitlab.email)
        await page.type("#user_password", gitlab.password)
        await page.click("input[name=commit]")
        const json: GitLabLoginStatus = await page.evaluate(() => JSON.parse(document.querySelector("body")!.innerText))
        expect(json.data!.id).toBe(4580019)
        expect(json.data!.name).toBe("Plumier Tester")
    }, 1000000)
})