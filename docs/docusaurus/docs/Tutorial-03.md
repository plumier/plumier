---
id: tutorial-03
title: Step 3 - Securing API
---

- Brief intro about authorization, App level authorization, 
- Login Controller 
- Bind current login user
- Authorize fields
- Authorize filter
- Securing properties
- Securing User 
- Securing Todo Data
- Securing Todo Comment




## Bind Current Login User 

We can't test our Todo API yet, because we need to assign current login user to the `user` property. We can do that easily with request hook like previously used to hash the password. 
