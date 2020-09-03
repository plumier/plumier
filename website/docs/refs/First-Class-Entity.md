---
id: first-class-entity
title: First Class Entity
---

First Class Entity is a term used in Plumier to express that Plumier treat entity object (ORM/ODM entity object) as a first class citizen.

Mostly in frameworks with strong SOLID architecture, Entity object is just a mapping object to a database table. It's impossible to use entity object in upper layer of the architecture such as business layer or application layer, because its might cause some issues.



## 1. Control type conversion from entity 
## 2. Control authorization from entity (property auth, filter auth, route auth)
## 3. Control validation from entity (property validation, class validation)
## 4. Control default value from entity (ORM/ODM default value, request related default value)
## 5. Control route generation from entity (simple route, nested route)
