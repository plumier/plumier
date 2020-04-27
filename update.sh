#!/bin/bash
ncu -a
ncu -a --packageFile packages/core/package.json
ncu -a --packageFile packages/jwt/package.json
ncu -a --packageFile packages/mongoose/package.json
ncu -a --packageFile packages/plumier/package.json
ncu -a --packageFile packages/serve-static/package.json
ncu -a --packageFile packages/social-login/package.json
rm -f yarn.lock 
rm -rf node_modules
yarn install
yarn test