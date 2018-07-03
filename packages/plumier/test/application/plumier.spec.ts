import { Plumier } from "../../src";
import { consoleLog } from '../helper';


describe("Plumier", () => {
    it("Should throw error if no controller path found", async () => {
        const plum = new Plumier()
        plum.set({ controller: "hello.js" })
        try {
            await plum.initialize()
        }
        catch (e) {
            expect(e.message).toContain("PLUM1004")
        }
    })

    it("Should run analysis on debug mode", async () => {
        class AnimalController {
            get(id: string) { }
        }
        consoleLog.startMock()
        const plum = new Plumier()
        plum.set({ controller: [AnimalController] })
        await plum.initialize()
        const log = (console.log as any).mock.calls
        expect(log[0][0]).toContain("1. AnimalController.get(id) -> GET   /animal/get")
        consoleLog.clearMock()
    })
})