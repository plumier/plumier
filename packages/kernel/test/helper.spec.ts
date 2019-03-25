import "@plumier/core"
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';
import {normalize} from "upath"
import { findFilesRecursive, createRoute } from '@plumier/kernel';


describe("StringUtil.format", () => {
    it("Should assigned value properly", () => {
        const result = "One: {0}, Two: {1}, Three: {2}".format(1, 2, 3)
        expect(result).toBe("One: 1, Two: 2, Three: 3")
    })

    it("Should not assigned if the index is not specified", () => {
        const result = "One: {0}, Three: {2}".format(1, 2, 3)
        expect(result).toBe("One: 1, Three: 3")
    })

    it("Should keep the template if value not provided", () => {
        const result = "One: {0}, Two: {1}, Three: {2}, Four: {3}".format(1, 2, 3)
        expect(result).toBe("One: 1, Two: 2, Three: 3, Four: {3}")
    })
})


describe("resolvePath", () => {
    it("Should resolve directory", () => {
        const result = findFilesRecursive(join(__dirname, "./resolve-path"))
        expect(normalize(result[0])).toBe(join(__dirname, "./resolve-path/my-module"))
    })

    it("Should resolve file if extension not specified", () => {
        const result = findFilesRecursive(join(__dirname, "./resolve-path/my-module"))
        expect(result[0]).toBe(join(__dirname, "./resolve-path/my-module"))
    })

    it("Should resolve file if extension not specified", () => {
        const jsFile = join(__dirname, "./no-js/no-js.js")
        if (existsSync(jsFile)) unlinkSync(jsFile)
        const result = findFilesRecursive(join(__dirname, "./no-js/no-js"))
        expect(result[0]).toBe(join(__dirname, "./no-js/no-js"))
    })

    it("Should resolve file with extension", () => {
        const result = findFilesRecursive(join(__dirname, "./resolve-path/my-module.ts"))
        expect(result[0]).toBe(join(__dirname, "./resolve-path/my-module.ts"))
    })

})

describe("createRoute", () => {
    it("Should join path properly", () => {
        const result = createRoute("a", "b", "c")
        expect(result).toBe("/a/b/c")
    })

    it("Should transform to lowercase", () => {
        const result = createRoute("a", "B", "c")
        expect(result).toBe("/a/b/c")
    })

    it("Should ignore undefined", () => {
        const result = createRoute("a", <any>undefined, "B", "c")
        expect(result).toBe("/a/b/c")
    })

    it("Should ignore empty string", () => {
        const result = createRoute("a", "", "B", "c")
        expect(result).toBe("/a/b/c")
    })

    it("Should ignore slash", () => {
        const result = createRoute("/a", "/", "B", "/c")
        expect(result).toBe("/a/b/c")
    })

    it("Should keep route", () => {
        const result = createRoute("/a", "/B/c", "d")
        expect(result).toBe("/a/b/c/d")
    })
})