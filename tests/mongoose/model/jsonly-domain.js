"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mongoose_1 = require("@plumier/mongoose");
let DomainWithPrimitives = class DomainWithPrimitives {
    constructor(name, deceased, age, registerDate) {
        this.name = name;
        this.deceased = deceased;
        this.age = age;
        this.registerDate = registerDate;
    }
};
DomainWithPrimitives = tslib_1.__decorate([
    mongoose_1.collection(),
    tslib_1.__metadata("design:paramtypes", [String, Boolean, Number, Date])
], DomainWithPrimitives);
exports.DomainWithPrimitives = DomainWithPrimitives;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbmx5LWRvbWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImpzb25seS1kb21haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0RBQStDO0FBRy9DLElBQWEsb0JBQW9CLEdBQWpDLE1BQWEsb0JBQW9CO0lBQzdCLFlBQ1csSUFBWSxFQUNaLFFBQWlCLEVBQ2pCLEdBQVcsRUFDWCxZQUFrQjtRQUhsQixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osYUFBUSxHQUFSLFFBQVEsQ0FBUztRQUNqQixRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ1gsaUJBQVksR0FBWixZQUFZLENBQU07SUFDekIsQ0FBQztDQUNSLENBQUE7QUFQWSxvQkFBb0I7SUFEaEMscUJBQVUsRUFBRTtzRUFNZ0IsSUFBSTtHQUxwQixvQkFBb0IsQ0FPaEM7QUFQWSxvREFBb0IifQ==