import reflect from "tinspector"
import { route } from "plumier"
import { generateRoutes } from "@plumier/core"
import { transformRoute } from '@plumier/swagger'
import { OpenApiBuilder, PathItemObject, ResponseObject } from 'openapi3-ts'


describe("Transformer", () => {
    describe("GET method", () => {
        it("Should transform properly", () => {
            class Animal { }
            class AnimalController {
                @reflect.type(Animal)
                @route.get(":id")
                get(id: string): Promise<Animal> {
                    throw new Error()
                }
            }
            const routes = generateRoutes("", AnimalController)
            const data = transformRoute(routes[0])
            expect(data).toMatchObject(<PathItemObject>{
                get: {
                    parameters: [
                        {
                            in: "path",
                            name: "id",
                            schema: { type: "string" },
                            required:true
                        }
                    ],
                    responses: {
                        default: {
                            content: {}
                        }
                    }
                }
            })
        })
    })

})