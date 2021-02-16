import React from "react";

const features = [
    {
        title: 'First Class Entity',

        description: (<>
            <p>
                Upgrade ORM entity into First Class Entity to have more control to most framework features
                such as request/response body schema, authorization, validation, generated routes.
                In the background, Plumier creates CRUD Restful generic controller uses ORM entity as its data model.
            </p>

            <table>
                <thead>
                    <tr><th>Method</th><th>Path</th><th>Accessible By</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>GET</td>
                        <td><code>/items</code></td>
                        <td>All login users</td>
                    </tr>
                    <tr>
                        <td>GET</td>
                        <td><code>/items/&#123;id&#125;</code></td>
                        <td>All login users</td>
                    </tr>
                    <tr>
                        <td>POST</td>
                        <td><code>/items</code></td>
                        <td>Supervisor, Staff</td>
                    </tr>
                    <tr>
                        <td>PUT</td>
                        <td><code>/items/&#123;id&#125;</code></td>
                        <td>Supervisor, Staff</td>
                    </tr>
                    <tr>
                        <td>PATCH</td>
                        <td><code>/items/&#123;id&#125;</code></td>
                        <td>Supervisor, Staff</td>
                    </tr>
                    <tr>
                        <td>DELETE</td>
                        <td><code>/items/&#123;id&#125;</code></td>
                        <td>Supervisor, Staff</td>
                    </tr>
                </tbody>
            </table>

        </>),

        link: {
            url: "generic-controller",
        },

        code:
            `// create CRUD generic controller on the fly
@route.controller(c => {
    // authorize post, put, patch, delete
    c.mutators().authorize("Supervisor", "Staff");
})
// use TypeORM entity as generic controller model
@Entity()
export class Item {
    @PrimaryGeneratedColumn()
    id: number;

    // validate max characters allowed
    @val.length({ max: 128 })
    @Column()
    name: string;

    // authorize request/response body property
    @authorize.readWrite("Supervisor", "Staff")
    @Column()
    basePrice: number;

    // authorize request body property
    @authorize.write("Supervisor")
    @Column()
    price: number;
}`
    },

    {
        title: 'Policy Based Authorization',

        description: (<>
            <p>
                Define your authorization logic in separate location, then apply it using decorators. 
            </p>
        </>),

        link: {
            url: "controller",
        },

        code:
        `// register with authorization policy builder
authPolicy()
    // register role
    .register("Supervisor", ({ user }) => {
        // "user" is JWT claim from request header
        // return true to authorize otherwise false
        // also possible to return Promise<boolean>
        return user?.role === "Supervisor"
    })

    // chain method with next registration
    .register("Staff", ({ user }) => {
        return user?.role === "Staff"
    })`
    },

    {
        title: 'Swagger UI with Open API v3',

        description: (<>
            <p>
                Open API v3 schema automatically generated from controller metadata. 
                Mostly no configuration required, but some minor tweak can be applied to get result match your need.
            </p>
        </>),

        link: {
            url: "swagger",
        },

        image: "/img/swagger.png"
    },

    {
        title: 'Nested First Class Entity',

        description: (<>
            <p>
                Turn One-To-Many relation of ORM entity into nested API Restful API, that handled by a nested generic controller.
            </p>
            <table>
                <thead>
                    <tr><th>Method</th><th>Path</th><th>Description</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>GET</td>
                        <td><code>/posts/&#123;pid&#125;/comments</code></td>
                        <td>Get post comments with paging, filter etc..</td>
                    </tr>
                    <tr>
                        <td>GET</td>
                        <td><code>/posts/&#123;pid&#125;/comments/&#123;id&#125;</code></td>
                        <td>Get post comment by id with projection</td>
                    </tr>
                    <tr>
                        <td>POST</td>
                        <td><code>/posts/&#123;pid&#125;/comments</code></td>
                        <td>Create new post comment</td>
                    </tr>
                    <tr>
                        <td>PUT</td>
                        <td><code>/posts/&#123;pid&#125;/comments/&#123;id&#125;</code></td>
                        <td>Replace post comment by id</td>
                    </tr>
                    <tr>
                        <td>PATCH</td>
                        <td><code>/posts/&#123;pid&#125;/comments/&#123;id&#125;</code></td>
                        <td>Modify post comment by id</td>
                    </tr>
                    <tr>
                        <td>DELETE</td>
                        <td><code>/posts/&#123;pid&#125;/comments/&#123;id&#125;</code></td>
                        <td>Delete post comment by id</td>
                    </tr>
                </tbody>
            </table>
        </>),

        link: {
            url: "generic-controller",
        },

        code:
            `@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number

    // turn one to many relation into nested API
    @route.controller()
    @OneToMany(x => Comment, x => x.post)
    comments: Comment[]
}

@Entity()
export class Comment {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    comment:string
}`
    },

    {
        title: 'Controllers',

        description: (<>
            <p>
                Require more flexible response result then using First Class Entity? No problem, 
                you still can use controller to handle user request.
            </p>
            <p>
                Plumier controller inspired by ASP.Net MVC controllers, and take important role in Plumier system. 
            </p>
            <ul>
                <li>Routes generated based on controller name and action name, but overridable using decorators</li>
                <li>Parameter binding using parameter name or decorators</li>
                <li>Extra data type conversion and simple sanitation for each controller parameter</li>
                <li>Policy based authorization that applicable using decorators</li>
            </ul>
        </>),

        link: {
            url: "controller",
        },

        code:
        `export class UsersController {
    readonly repo = new TypeORMRepository(User)

    // GET /users/:id
    @route.get(":id")
    get(id:string) { 

        // return value or Promise 
        // automatically rendered into JSON response
        return this.repo.findOne(id)
    }
}`
    },

];

export default features;