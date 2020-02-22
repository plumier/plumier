import { Class } from "./common";
import { Facility, VirtualRouteInfo, VirtualRouteInfoDecorator } from './types';
import reflect from "tinspector"



function getVirtualRoutes(facilities: Facility[]) {
    const routes: VirtualRouteInfo [] = []
    for (const facility of facilities) {
        const meta = reflect(facility.constructor as Class)
        const infos = meta.decorators.filter((x: VirtualRouteInfoDecorator): x is VirtualRouteInfoDecorator => x.type === "VirtualRoute")
            .map(x => x.info)
        routes.push(...infos)
    }
    return routes
}

function printVirtualRoutes(routes:VirtualRouteInfo[]){

}