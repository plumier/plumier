#!/bin/bash

# make sure if its in master branch
if [[ $(git rev-parse --abbrev-ref HEAD) != "master" ]]; then 
    echo 'Command must be run in master branch';
    exit 1
fi 
# update packages deep
ncu -u --deep
# check if update successful
if git diff-index --quiet HEAD --; then
    # No git changes (no update)
    echo 'Packages already up to date!'
    exit 1
fi
# remove all dependent libraries
rm -rf node_modules **/node_modules yarn.lock
# install and test
yarn install
# push to upgrade branch
git branch -D upgrade 
git checkout -b upgrade 
git add . && git commit -m "chore: Upgrade dependencies"
git push -u origin upgrade