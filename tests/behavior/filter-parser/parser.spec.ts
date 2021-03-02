import { parseFilter } from "@plumier/filter-parser"


describe(`Filter Parser`, () => {
    function comparison(opr: string) {
        it(`Should able to compare property with number`, () => {
            expect(parseFilter(`column${opr}12345234554`)).toMatchSnapshot()
            expect(parseFilter(`column${opr}123452.234`)).toMatchSnapshot()
        })
        it(`Should able to compare property with boolean`, () => {
            expect(parseFilter(`column${opr}true`)).toMatchSnapshot()
            expect(parseFilter(`column${opr}false`)).toMatchSnapshot()
        })
        it(`Should able to compare property with string`, () => {
            expect(parseFilter(`column${opr}'lorem ipsum'`)).toMatchSnapshot()
        })
        it(`Should skip white space`, () => {
            expect(parseFilter(` column  ${opr}  12345  `)).toMatchSnapshot()
        })
        it(`Should not allow property name start with number`, () => {
            expect(() => parseFilter(`12column${opr}12345234554`)).toThrowError()
        })
        it(`Should allow property name ends with number`, () => {
            expect(parseFilter(`column123${opr}12345234554`)).toMatchSnapshot()
        })
        it(`Should allow property name with underscore`, () => {
            expect(parseFilter(`column_123${opr}12345234554`)).toMatchSnapshot()
        })
        it(`Should able to use swap position of property and value`, () => {
            expect(parseFilter(`1234${opr}column`)).toMatchSnapshot()
        })
    }

    describe(`Equal Parser`, () => { comparison(`=`) })
    describe(`Not Equal Parser`, () => { comparison(`!=`) })
    describe(`Greater Than Parser`, () => { comparison(`>`) })
    describe(`Less Than Parser`, () => { comparison(`<`) })
    describe(`Greater Than Equal Parser`, () => { comparison(`>=`) })
    describe(`Less Than Equal Parser`, () => { comparison(`<=`) })

    describe("Like Parser", () => {
        it("Should parse exact string", () => {
            expect(parseFilter(`column = 'abcd'`)).toMatchSnapshot()
        })
        it("Should parse string with starts preference", () => {
            expect(parseFilter(`column = 'abcd'*`)).toMatchSnapshot()
        })
        it("Should parse string with ends preference", () => {
            expect(parseFilter(`column = *'abcd'`)).toMatchSnapshot()
        })
        it("Should parse string with contains preference", () => {
            expect(parseFilter(`column = *'abcd'*`)).toMatchSnapshot()
        })
        it("Should not allow reverse side position", () => {
            expect(() => parseFilter(`*'abc' = column`)).toThrowErrorMatchingSnapshot()
        })
    })    

    function logic(opr: string) {
        it(`Should able to group comparisons`, () => {
            expect(parseFilter(`column=12345234554 ${opr} column='lorem ipsum'`)).toMatchSnapshot()
        })
        it(`Should case insensitive`, () => {
            expect(parseFilter(`column=12345234554 ${opr.toUpperCase()} column='lorem ipsum'`)).toMatchSnapshot()
        })
        it(`Should able to pipe logical expression`, () => {
            expect(parseFilter(`column=1 ${opr} column=2 ${opr} column=3`)).toMatchSnapshot()
        })
        it(`Should skip white space`, () => {
            expect(parseFilter(`column=12345234554    ${opr}   column='lorem ipsum'`)).toMatchSnapshot()
        })
    }

    describe(`And Parser`, () => { logic(`and`) })
    describe(`Or Parser`, () => { logic(`or`) })

    describe(`Group Parser`, () => {
        it(`Should able to group comparison`, () => {
            expect(parseFilter(`(column=12345234554)`)).toMatchSnapshot()
        })
        it(`Should able to group logic`, () => {
            expect(parseFilter(`(column=12345234554 and column='lorem ipsum')`)).toMatchSnapshot()
        })
        it(`Should prioritized group`, () => {
            expect(parseFilter(`column=1 and (column=2 and column=3)`)).toMatchSnapshot()
            expect(parseFilter(`column=1 and (column=2 and column=3) and column=4`)).toMatchSnapshot()
        })
    })

    describe("Logical Order", () => {
        it("Should parse from right", () => {
            expect(parseFilter(`col=1 and col=2 and col=3`)).toMatchSnapshot()
        })
        it("Should parse OR first", () => {
            expect(parseFilter(`col=1 or col=2 and col=3`)).toMatchSnapshot()
        })
        it("Should prioritize group", () => {
            expect(parseFilter(`col=1 and (col=2 and col=3)`)).toMatchSnapshot()
        })
    })

    describe(`String`, () => {
        it(`Should allow single quote`, () => {
            expect(parseFilter(`lorem='ipsum'`)).toMatchSnapshot()
        })
        it(`Should allow double quote`, () => {
            expect(parseFilter(`lorem="ipsum"`)).toMatchSnapshot()
        })
        it(`Should not greedy`, () => {
            expect(parseFilter(`lorem='ipsum' AND lorem='ipsum'`)).toMatchSnapshot()
        })
        it(`Should able to escape quote`, () => {
            expect(parseFilter(`lorem='ips\\'um'`)).toMatchSnapshot()
            expect(parseFilter(`lorem="ips\\"um"`)).toMatchSnapshot()
        })
    })

    describe(`Not Parser`, () => {
        it(`Should able to use not with expression`, () => {
            expect(parseFilter(`! column=12345234554`)).toMatchSnapshot()
        })
        it(`Should able to use not with column`, () => {
            expect(parseFilter(`! column`)).toMatchSnapshot()
        })
        it(`Should able to use without space`, () => {
            expect(parseFilter(`!column=123`)).toMatchSnapshot()
            expect(parseFilter(`!column`)).toMatchSnapshot()
        })
        it(`Should prioritized than binary expression`, () => {
            expect(parseFilter(`column=123 and !(column=12345234554)`)).toMatchSnapshot()
        })
        it(`Should not confused in string`, () => {
            expect(parseFilter(`column='!123'`)).toMatchSnapshot()
        })
    })

    describe(`Range Value`, () => {
        it(`Should parse correctly`, () => {
            expect(parseFilter(`column=1 to 2`)).toMatchSnapshot()
        })
        it(`Should parse grouping`, () => {
            expect(parseFilter(`column=(1 to 2)`)).toMatchSnapshot()
        })
        it(`Should parse case insensitive`, () => {
            expect(parseFilter(`column=1 TO 2`)).toMatchSnapshot()
        })
        it(`Should parse string range`, () => {
            expect(parseFilter(`column='2020-1-1' to '2020-1-1'`)).toMatchSnapshot()
        })
        it(`Should not parse boolean range`, () => {
            expect(() => parseFilter(`column=true to false`)).toThrowErrorMatchingSnapshot()
        })
    })
})
