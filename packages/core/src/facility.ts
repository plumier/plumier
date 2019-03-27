import { PlumierApplication } from './application';
import { RouteInfo } from './route-generator';

export interface Facility {
    setup(app: Readonly<PlumierApplication>): void
    initialize(app: Readonly<PlumierApplication>, routes: RouteInfo[]): Promise<void>
}

export class DefaultFacility implements Facility {
    setup(app: Readonly<PlumierApplication>) { }
    async initialize(app: Readonly<PlumierApplication>, routes: RouteInfo[]) { }
}
