import { domain, Application } from "@plumjs/core";
import { model, MongooseFacility } from '@plumjs/mongoose';
import Mongoose from 'mongoose';
import { MyModel } from './domain-with-model/domain';


describe("Proxy", () => {
    it("Should be able to defined model before object compiled", async () => {
        @domain()
        class AnimalDomain {
            constructor(public name:string){}
        }
        const AnimalModel = model(AnimalDomain)
        const facility = new MongooseFacility({
            domainModel: AnimalDomain,
            uri: "mongodb://localhost:27017/test-data"})
        await facility.setup({} as Application)
        await AnimalModel.remove({})
        const result = await new AnimalModel({name: "Mimi"}).save()
        expect(result.name).toBe("Mimi")
        await Mongoose.disconnect()
    })

    it("Should be able to defined model in model folder", async () => {
        const facility = new MongooseFacility({
            domainModel: "./domain-with-model",
            uri: "mongodb://localhost:27017/test-data"})
        await facility.setup({} as Application)
        await MyModel.remove({})
        const result = await new MyModel({name: "Mimi"}).save()
        expect(result.name).toBe("Mimi")
        await Mongoose.disconnect()
    })
})