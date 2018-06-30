import { Context } from "koa";

import { ActionResult, Invocation } from "../../src/";
import { pipe } from '../../src/application';


describe("Middleware Pipeline", () => {
    class DummyInvocation implements Invocation {
        constructor(public context: Readonly<Context>) { }

        async proceed(): Promise<ActionResult> {
            return new ActionResult({ body: "Mimi" })
        }
    }

    it("Should pipe middleware in proper order", async () => {
        let data = ""
        const firstMdw = async (x: Invocation) => {
            data += "first"
            const result = await x.proceed()
            data += "second"
            return result
        }
        const secondMdw = async (x: Invocation) => {
            data += "third"
            const result = await x.proceed()
            data += "forth"
            return result
        }
        const result = await pipe([{ execute: firstMdw }, { execute: secondMdw }], <any>{}, new DummyInvocation(<any>{})).proceed()
        expect(data).toBe("firstthirdforthsecond")
        expect(result.body).toEqual({ body: "Mimi" })
    })

    it("Should able to cancel next invocation on first", async () => {
        let data = ""
        const firstMdw = async (x: Invocation) => {
            return new ActionResult({body: "The rest middleware never touched"})
        }
        const secondMdw = async (x: Invocation) => {
            data += "third"
            const result = await x.proceed()
            data += "forth"
            return result
        }
        const result = await pipe([{ execute: firstMdw }, { execute: secondMdw }], <any>{}, new DummyInvocation(<any>{})).proceed()
        expect(data).toBe("")
        expect(result.body).toEqual({ body: "The rest middleware never touched" })
    })
})