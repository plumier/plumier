#!/bin/bash 

git branch -D upgrade 
git checkout -b upgrade 
git add . && git commit -m "chore: Upgrade dependencies"
git push -u origin upgrade