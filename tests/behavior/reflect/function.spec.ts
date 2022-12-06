import reflect from "@plumier/reflect"


describe("Reflect function", () => {
    it("Should reflect function", () => {
        function myFunction() {}

        const meta = reflect(myFunction as any)
        
    })
})