#!/bin/bash

yarn doc:build
cd docs/website
git add .
git commit -m "Update documentation"
git push
cd ../..
# git branch -D update-documentation 
# git checkout -b update-documentation
# git add .
# git commit -m "chore: Publish documentation"
# git push -u --no-verify origin update-documentation
