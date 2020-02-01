import { collection } from '@plumier/mongoose';

@collection()
export class DomainWithPrimitivesForTS {
    constructor(
        public name: string,
        public deceased: boolean,
        public age: number,
        public registerDate: Date
    ) { }
}
