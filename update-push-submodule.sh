#!/bin/bash 

git submodule foreach "git branch -D upgrade"
git submodule foreach "git checkout -b upgrade"
git submodule foreach "git add . && git commit -m \"chore: Upgrade dependencies\""
git submodule foreach "git push -u origin upgrade"