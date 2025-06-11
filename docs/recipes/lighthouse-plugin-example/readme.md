# Lighthouse plugin recipe

The result of this guide can be found at our [Lighthouse Plugin GitHub repository template](https://github.com/GoogleChrome/lighthouse-plugin-example)

## Contents
- `package.json` - declares the plugin's entry point (`plugin.js`)
- `plugin.js` - instructs Lighthouse to run the plugin's own `preload-as.js` audit; describes the new category and its details for the report
- `audits/preload-as.js` - the new audit to run in addition to Lighthouse's default audits

## To develop as a plugin developer

Run the following to start of with the recipe as a template:

```sh
mkdir lighthouse-plugin-example && cd lighthouse-plugin-example
curl -L https://github.com/GoogleChrome/lighthouse/archive/main.zip | tar -xzv
mv lighthouse-main/docs/recipes/lighthouse-plugin-example/* ./
rm -rf lighthouse-main
```

Install and run just your plugin:

```sh
yarn
NODE_PATH=.. npx lighthouse -- https://example.com --plugins=lighthouse-plugin-example --only-categories=lighthouse-plugin-example --view
```

When you rename the plugin, be sure to rename its directory as well.

### Iterating
To speed up development, you can gather once and iterate by auditing repeatedly.

```sh
# Gather artifacts from the browser
NODE_PATH=.. npx lighthouse -- https://example.com --plugins=lighthouse-plugin-example --only-categories=lighthouse-plugin-example --gather-mode

# and then iterate re-running this:
NODE_PATH=.. npx lighthouse -- https://example.com --plugins=lighthouse-plugin-example --only-categories=lighthouse-plugin-example --audit-mode --view
```

Finally, publish to NPM.

## To run as a plugin user

1. Install `lighthouse` (v5+) and the plugin `lighthouse-plugin-example`, likely as `devDependencies`.
   * `npm install -D lighthouse lighthouse-plugin-example`
1. To run your private lighthouse binary, you have three options
   1. `npx --no-install lighthouse -- https://example.com --plugins=lighthouse-plugin-example --view`
   1. `yarn lighthouse https://example.com --plugins=lighthouse-plugin-example --view`
   1. Add an npm script calling `lighthouse` and run that.


## Result

![Screenshot of report with plugin results](./plugin-recipe-screenshot.png)
