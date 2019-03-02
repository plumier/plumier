import { benchmark } from "./lib"
import { options } from './options';


(async () => {
    const titlePad = Math.max(...options.map(x => x.title!.length))
    console.log(
        "Server".padEnd(12), 
        "Req/s".padEnd(9), 
        "Method".padEnd(6), 
        "Description".padEnd(titlePad), 
        "Request Stats")
    for (const opt of options) {
        const result = await benchmark(opt)
        console.log(
            result.server.padEnd(12), 
            result.requests.toString().padEnd(9), 
            opt.method!.padEnd(6), 
            result.title.padEnd(titlePad), 
            result.stats)
    }
})()