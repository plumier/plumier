import { parseFilter } from "@plumier/core"


describe("Filter Parser", () => {
    describe("Equals Parser", () => {
        it.only("Should able to compare column with number", () => {
            expect(parseFilter("column=12345234554")).toMatchSnapshot()
            expect(parseFilter("column=123452.234")).toMatchSnapshot()
        })
        it("Should able to compare column with boolean", () => {
            expect(parseFilter("column=true")).toMatchSnapshot()
            expect(parseFilter("column=false")).toMatchSnapshot()
        })
        it("Should able to compare column with string", () => {
            expect(parseFilter("column=\"lorem ipsum\"")).toMatchSnapshot()
            expect(parseFilter("column='lorem ipsum'")).toMatchSnapshot()
        })
        it("Should skip white space", () => {
            expect(parseFilter(" column  =  12345  ")).toMatchSnapshot()
        })
    })
})