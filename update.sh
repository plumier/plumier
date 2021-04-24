#!/bin/bash

# make sure if its in master branch
if [[ $(git rev-parse --abbrev-ref HEAD) != "master" ]]; then 
    echo 'Command must be run in master branch';
    exit 1
fi 
# update root package
ncu -u
# update documentation package
ncu -u --packageFile docs/docusaurus/package.json
# update pckages
for file in packages/*/package.json; do
    ncu -u --packageFile "$file"
done
# check if update successful
if git diff-index --quiet HEAD --; then
    # No git changes (no update)
    echo 'Packages already up to date!'
    exit 1
fi
# remove all dependent libraries
rm -f yarn.lock 
rm -rf node_modules
# install and test
yarn install
# push to upgrade branch
git branch -D upgrade 
git checkout -b upgrade 
git add . && git commit -m "chore: Upgrade dependencies"
git push -u origin upgrade