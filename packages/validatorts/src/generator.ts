/* istanbul ignore next */

import Validator from "validator"
import Ejs from "ejs"
import { getParameterNames } from "tinspector"

/*
export function after(opt?: Opt & { date?: string }) {
    return validate(x => Validator.isAfter(x, opt && opt.date), opt && opt.message || "Invalid date")
}
*/

const functionTemplate = `
export function <%= name %>(opt?: Opt<%- option %>) {
    return validate(x => Validator.<%= fnName %>(x<%- optionParam %>), opt && opt.message || "Invalid value provided")
}`

/*
test.only("email", async () => {
    @model()
    class Dummy {
        constructor(@val.email() public property: string) { }
    }
    expect(validate(new Dummy("abc123-234")))
        .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
    //expect(validate(new Dummy(""))).toEqual([])
})
*/

const testTemplate = `
test.only("<%= name%>", async () => {
    @model()
    class Dummy {
        constructor(@val.<%= name%>() public property: string) { }
    }
    expect(validate(new Dummy("abc123-234")))
        .toEqual([{ "messages": ["Invalid value provided"], "path": ["property"], "value": "" }])
    //expect(validate(new Dummy(""))).toEqual([])
})`

function compileFunction(fnName: string) {
    const nameWithoutIs = fnName.substr(2)
    const name = nameWithoutIs.charAt(0).toLowerCase() + nameWithoutIs.substr(1);
    const tmp = Ejs.compile(functionTemplate)
    const param = getParameterNames((Validator as any)[fnName] as Function)
    let option = ""
    let optionParam = ""
    if (param && param[1]) {
        option = ` & { ${param[1]}?: any }`
        optionParam = ` , opt && opt.${param[1]}`
    }
    return tmp({ name, fnName, option, optionParam })
}

function compileTest(fnName: string) {
    const nameWithoutIs = fnName.substr(2)
    const name = nameWithoutIs.charAt(0).toLowerCase() + nameWithoutIs.substr(1);
    const tmp = Ejs.compile(testTemplate)
    return tmp({ name })
}

const exceptional = ["isIn", "isRFC3339", "isPostalCodeLocales", "isISO31661Alpha3", "isIPRange"]

Object.keys(Validator)
    .filter(x => x.startsWith("is"))
    .filter(x => Boolean((Validator as any)[x]))
    .filter(x => !exceptional.some(e => e == x))
    .sort((a, b) => a < b ? -1 : a == b ? 0 : 1)
    .forEach(x => {
        if (process.argv[2] === "test")
            console.log(compileTest(x))
        else
            console.log(compileFunction(x))
    })
