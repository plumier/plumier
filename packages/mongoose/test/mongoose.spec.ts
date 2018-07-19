import { domain, Application } from "@plumjs/core";
import { MongooseFacility, mongoose } from '@plumjs/mongoose';
import Mongoose from "mongoose"


describe("Mongoose", () => {
    beforeEach(async () => {
        
    })
    it("MongooseFacility should generate models", async () => {
        @domain()
        class AnimalModel {
            constructor(
                public name:string,
                public deceased:boolean,
                public age:number,
                public registerDate:Date
            ){}
        }
        const facility = new MongooseFacility({model: AnimalModel, uri: "mongodb://localhost/test-data"})
        facility.setup({} as Application)
        const AnimalOdm = mongoose(AnimalModel)
        await AnimalOdm.remove({})
        const mdl = new AnimalModel("Mimi", false, 5, new Date("2018-1-1"))
        const saved = await new AnimalOdm(mdl).save()
        const queried = await AnimalOdm.findById(saved._id)
        expect(queried!.toObject()).toEqual(mdl)
    })
})