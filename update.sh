#!/bin/bash
npx npm-check-updates
npx npm-check-updates -a --packageFile packages/core/package.json
npx npm-check-updates -a --packageFile packages/jwt/package.json
npx npm-check-updates -a --packageFile packages/mongoose/package.json
npx npm-check-updates -a --packageFile packages/multipart/package.json
npx npm-check-updates -a --packageFile packages/plumier/package.json
npx npm-check-updates -a --packageFile packages/serve-static/package.json
npx npm-check-updates -a --packageFile packages/social-login/package.json
yarn install
yarn test