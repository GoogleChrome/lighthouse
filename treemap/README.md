# Lighthouse Treemap Viewer

[Demo](https://googlechrome.github.io/lighthouse/treemap/?gist=30a18304de56e7be08f10976a1b11702)

## Development

```sh
yarn serve-treemap

# in separate terminal, start build watch
# dependency: `brew install entr`
find treemap | entr -s 'DEBUG=1 yarn build-treemap'
open http://localhost:7333/treemap/?debug
```
