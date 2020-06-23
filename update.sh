#!/bin/bash

# update root package
ncu -a
# update pckages
for file in packages/*/package.json; do
    ncu -a --packageFile "$file"
done
# remove all dependent libraries
rm -f yarn.lock 
rm -rf node_modules
# install and test
yarn install
yarn test