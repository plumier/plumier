import { Class, Configuration } from '../src/core';
import { Plumier, WebApiFacility } from '../src/application';

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
    const mergedConfig = <Configuration>{ ...{ mode: "production" }, ...config }
    return new Plumier()
        .set(new WebApiFacility({ controller }))
        .set(mergedConfig)
}