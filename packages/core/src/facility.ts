import { PlumierApplication } from './application';
import { RouteInfo } from './route-generator';

interface Facility {
    setup(app: Readonly<PlumierApplication>): void
    initialize(app: Readonly<PlumierApplication>, routes: RouteInfo[]): Promise<void>
}

class DefaultFacility implements Facility {
    setup(app: Readonly<PlumierApplication>) { }
    async initialize(app: Readonly<PlumierApplication>, routes: RouteInfo[]) { }
}

export { Facility, DefaultFacility }