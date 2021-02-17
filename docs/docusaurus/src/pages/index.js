import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useThemeContext from '@theme/hooks/useThemeContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const features = [
  {
    title: 'First Class Entity',

    description: (<>
      <p>
        Upgrade ORM entity into First Class Entity to have more control to most framework features
        such as request/response body schema, authorization, validation, generated routes.
        In the background,
        </p>
      <p>
        Plumier creates CRUD Restful generic controller uses ORM entity as its data model,
        example produces:
          </p>
      <ul>
        <li><code>POST /items</code> accessible by Supervisor and Staff</li>
        <li><code>GET /items?offset&amp;limit&amp;filter&amp;select</code> accessible by any login user</li>
        <li><code>GET /items/&#123;id&#125;</code> accessible by any login user</li>
        <li><code>POST /items/&#123;id&#125;</code> accessible by Supervisor and Staff</li>
        <li><code>PUT /items/&#123;id&#125;</code> accessible by Supervisor and Staff</li>
        <li><code>DELETE /items/&#123;id&#125;</code> accessible by Supervisor and Staff</li>
      </ul>

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
    title: 'Nested First Class Entity',

    description: (<>
      <p>
        Turn One-To-Many relation of ORM entity into nested Restful API.
        Nested first class entity handled by specialized nested generic controller.
        </p>
      <ul>
        <li><code>POST /posts/&#123;pid&#125;/comments</code></li>
        <li><code>GET /posts/&#123;pid&#125;/comments?offset&amp;limit&amp;filter&amp;select</code></li>
        <li><code>GET /posts/&#123;pid&#125;/comments/&#123;id&#125;</code></li>
        <li><code>POST /posts/&#123;pid&#125;/comments/&#123;id&#125;</code></li>
        <li><code>PUT /posts/&#123;pid&#125;/comments/&#123;id&#125;</code></li>
        <li><code>DELETE /posts/&#123;pid&#125;/comments/&#123;id&#125;</code></li>
      </ul>
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
    title: 'Policy Based Authorization',

    description: (<>
      <p>
        Plumier supported securing API with JWT out of the box.
        Plumier also provided authorization to restrict user access based on specific logic defined by you.
        You define your authorization logic in separate location, then apply it using decorators.
          </p>
      <p>
        In the background Plumier validates your authorization policy to prevent mistyped policy name,
        or possibly duplicate/conflict policy name.
          </p>
    </>),

    link: {
      url: "security",
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

  // chain-able registration method
  .register("Staff", ({ user }) => {
      return user?.role === "Staff"
  })`
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
        <li>Routes generated based on controller name and action name.</li>
        <li>Parameter binding using parameter name or decorators.</li>
        <li>Extra data type conversion with simple sanitation for each controller parameter.</li>
        <li>Policy based authorization that applicable using decorators.</li>
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

  // POST /users
  @route.post("")
  // data parameter bound to request body
  save(data:User) {
    return this.repo.insert(data)
  }
}`
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
];


function Features() {
  return (<>
    {features.map((props, idx) => (
      <Feature key={idx} index={idx} {...props} />
    ))
    }
  </>
  );
}

function Feature({ description, title, code, link, index, image }) {
  const isEven = index % 2 === 0
  return (
    <section className={clsx(styles.feature, isEven ? styles.sectionDark : styles.sectionLight)}>
      <div className="container">
        <div className={clsx('row', styles.featureContainer, isEven ? styles.featureContainerOdd : styles.featureContainerEven)}>
          <div className={clsx('col col--5', styles.codeFont)}>
            {
              !!code ? <CodeSnippet code={code} /> : <img className={styles.featureImage} src={image} />
            }
          </div>
          <div className={clsx("col col--7", styles.featureDescription)}>
            <h3>Feature</h3>
            <h1>{title}</h1>
            <div>{description}</div>
            <Link to={link.url} className={clsx('button button--secondary button--lg', styles.featureButton)}>Learn more about this feature</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function CodeSnippet({ code }) {
  return (
    <div className={clsx(styles.codeBorder)}>
      <div className={clsx(styles.codeTitleBox)}>
        <div className={clsx(styles.codeRgb, styles.rgbRed)}></div>
        <div className={clsx(styles.codeRgb, styles.rgbGreen)}></div>
        <div className={clsx(styles.codeRgb, styles.rgbBlue)}></div>
      </div>
      <CodeBlock metastring="typescript" className="typescript">{code}</CodeBlock>
    </div>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />">
      <header className={clsx('hero ', styles.heroBanner)}>
        <div className={clsx('container', styles.heroContainer)}>
          <h2 className="hero__subtitle">{siteConfig.title}</h2>
          <h1 className="hero__title">{siteConfig.tagline}</h1>
          <p>A TypeScript backend framework focuses on development productivity, uses dedicated reflection library to help you create a robust, secure and fast API delightfully.</p>
          <div className={styles.buttons}>
            <Link
              className={clsx(
                'button button--primary button--lg',
              )}
              to="quick-start">
              Quick Start
            </Link>
            <Link
              className={clsx(
                'button button--secondary button--lg',
              )}
              to="plumier-in-five-minutes">
              Plumier in Five Minutes
            </Link>
          </div>
        </div>
      </header>
      <main>
        <Features />
      </main>
    </Layout>
  );
}

export default Home;
