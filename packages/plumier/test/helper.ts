import { Class, Configuration } from "@plumier/core"
import { WebApiFacility } from "plumier/src/facility"

import Plumier from "../src"


export function fixture(controller: Class | Class[] | string, config?: Partial<Configuration>) {
    const mergedConfig = <Configuration>{ mode: "production", ...config }
    return new Plumier()
        .set(new WebApiFacility({ controller }))
        .set(mergedConfig)
}