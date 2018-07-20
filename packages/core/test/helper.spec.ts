import "@plumjs/core"
import { resolvePath } from '@plumjs/core';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';

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
        const result = resolvePath(join(__dirname, "./resolve-path"))
        expect(result[0]).toBe(join(__dirname, "./resolve-path/my-module"))
    })

    it("Should resolve file if extension not specified", () => {
        const result = resolvePath(join(__dirname, "./resolve-path/my-module"))
        expect(result[0]).toBe(join(__dirname, "./resolve-path/my-module"))
    })

    it("Should resolve file if extension not specified", () => {
        const jsFile = join(__dirname, "./no-js/no-js.js")
        if(existsSync(jsFile)) unlinkSync(jsFile)
        const result = resolvePath(join(__dirname, "./no-js/no-js"))
        expect(result[0]).toBe(join(__dirname, "./no-js/no-js"))
    })

    it("Should resolve file with extension", () => {
        const result = resolvePath(join(__dirname, "./resolve-path/my-module.ts"))
        expect(result[0]).toBe(join(__dirname, "./resolve-path/my-module.ts"))
    })

})