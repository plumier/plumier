
class Child {
    parent: Parent = {} as any
}

class Parent {
    child: Child = {} as any
}

const data = new Parent()
const chl = new Child()
data.child = chl
chl.parent = data;

export { data }