import { Class, Configuration } from '@plumjs/core';
import { Plumier, WebApiFacility } from '../src/application';


export function fixture(controller: Class | Class[] | string, config?: Partial<Configuration>) {
    const mergedConfig = <Configuration>{ mode: "production", ...config }
    return new Plumier()
        .set(new WebApiFacility({ controller }))
        .set(mergedConfig)
}