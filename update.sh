#!/bin/bash

# update root package
ncu -u
# update pckages
for file in packages/*/package.json; do
    ncu -u --packageFile "$file"
done
# remove all dependent libraries
rm -f yarn.lock 
rm -rf node_modules
# install and test
yarn install
yarn test