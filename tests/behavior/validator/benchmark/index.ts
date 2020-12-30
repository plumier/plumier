import joi from "./joi"
import typ from "./typedconverter"
import _ from "lodash"

function runTest(name: string, value: any, expect: any, fn: (val: any) => any) {
    //check 
    // const check = fn(value)
    // if (!_.isEqual(check, expect)) throw new Error(`Result not match ${name}`)
    console.log(JSON.stringify(fn(value)))
    const start = new Date()
    const iteration = 4000000;
    for (let i = 0; i < iteration; i++) {
        fn(value)
    }
    const end = new Date()
    return (end.getTime() - start.getTime()) / 1000
}


const validationTest = { name: "Lorem ipsum", email: "john.doe@gmail.com", date: "2018-2-2", address: { zip: "123", city: "CA", number: "123" } };
const conversionTest = { string: "hola", boolean: "true", date: "2018-2-2", number: "12345" };

const validationResult = joi.validator(validationTest).value
const conversionResult = joi.converter(conversionTest)

const tests = [
    { name: "Joi - Type conversion", fn: joi.converter, value: conversionTest, expect: conversionResult },
    { name: "Joi - Validation", fn: joi.validator, value: validationTest, expect: validationResult },
    { name: "TypedConverter - Type conversion", fn: typ.converter, value: conversionTest, expect: conversionResult },
    { name: "TypedConverter - Validation", fn: typ.validator, value: validationTest, expect: validationResult },
]

const result = []
for (const test of tests) {
    const time = runTest(test.name, test.value, test.expect, test.fn)
    result.push({ name: test.name, time: time.toFixed(2) })
}

const namePad = Math.max(...result.map(x => x.name.length))
const timePad = Math.max(...result.map(x => x.time.length))

console.log("Test Type".padEnd(namePad), "Sec".padStart(timePad))
for (const res of result) {
    console.log(res.name.padEnd(namePad), res.time.padStart(timePad))
}