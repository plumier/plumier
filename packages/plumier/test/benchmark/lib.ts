/// <reference path="autocannon.d.ts" />

import cannon, { CannonOption, CannonResult } from "autocannon"
import { fork } from "child_process"
import { basename } from 'path';

export type BenchmarkOption = CannonOption & { path: string, silent?: boolean, env?: any }

export async function benchmark(opt: BenchmarkOption) {
    const { path, silent, env, ...opts } = opt
    const cannonAsync = () => new Promise<CannonResult>(resolve => cannon({ ...opts }, (err, result) => resolve(result)))
    const process = fork(path, [], { silent, env })
    await new Promise(resolve => setTimeout(resolve, 2000))
    const result = await cannonAsync()
    process.kill('SIGINT')
    return {
        title: result.title,
        requests: result.requests.average,
        latency: result.latency.average,
        throughput: result.throughput.average,
        errors: result.errors,
        timeouts: result.timeouts,
        duration: result.duration,
        connections: result.connections,
        pipelines: result.pipelining,
        stats: {
            err: result.errors + result.timeouts,
            "1xx": (result as any)["1xx"],
            "2xx": (result as any)["2xx"],
            "3xx": (result as any)["3xx"],
            "4xx": (result as any)["4xx"],
            "5xx": (result as any)["5xx"],
        },
        server: basename(path)
    }
}
