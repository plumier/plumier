---
id: entry-point
title: Application Startup
---

Entry point of plumier rest api is the plumier startup application. Once initialized Plumier application will returned promised Koa instance.

```typescript
import Plumier from "plumier"

const koa = new Plumier()
    .initialize()
koa.then(k => k.listen(8000))
```

## Configuration
Plumier application can be configure by calling `set` method like below:

```typescript
import Plumier from "plumier"

const koa = new Plumier()
    .set({ mode: "production" })
    .initialize()
```

> Production mode is not necessary if you have NODE_ENV set to 'production'
