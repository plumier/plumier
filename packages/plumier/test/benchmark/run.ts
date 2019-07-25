import { benchmark } from "./lib"
import { options } from './options';


(async () => {
    console.log(
        "Server".padEnd(12), 
        "Req/s".padEnd(9), 
        "Method".padEnd(6), 
        "Request Stats")
    for (const opt of options) {
        const result = await benchmark(opt)
        console.log(
            result.server.padEnd(12), 
            result.requests.toString().padEnd(9), 
            opt.method!.padEnd(6), 
            result.stats)
    }
})()