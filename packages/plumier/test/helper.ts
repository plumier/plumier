import { Class, WebApiFacility, Configuration } from '../src/framework';
import { Plumier } from '../src/application';

const log = console.log;

export namespace consoleLog {
    export function startMock() {
        console.log = jest.fn(message => { })
    }
    export function clearMock() {
        console.log = log
    }
}


export function fixture(controller: Class | Class[] | string, config?: Partial<Configuration>) {
    const mergedConfig = <Configuration>{ ...{ controller: controller, mode: "production" }, ...config }
    return new Plumier()
        .set(new WebApiFacility())
        .set(mergedConfig)
}