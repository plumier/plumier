import { collection } from '@plumjs/mongoose';
import { array } from '@plumjs/reflect';

@collection()
export class DomainWithPrimitives {
    constructor(
        public name: string,
        public deceased: boolean,
        public age: number,
        public registerDate: Date
    ) { }
}

@collection()
export class DomainWithArrays {
    constructor(
        public name: string,
        @array(String)
        public children: string[]
    ) { }
}

@collection()
export class DomainWithDomain {
    constructor(
        public child: DomainWithPrimitives
    ) { }
}

@collection()
export class DomainWithArrayOfDomain {
    constructor(
        @array(DomainWithPrimitives)
        public children: DomainWithPrimitives[]
    ) { }
}