# lint and test all files
yarn test

# watch for file changes and run tests
#   Requires http://entrproject.org : brew install entr
yarn watch

## run linting, unit, and smoke tests separately
yarn lint
yarn unit
yarn smoke

## run tsc compiler
yarn type-check
