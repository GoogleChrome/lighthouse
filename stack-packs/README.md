# Stack packs

Stack packs extend Lighthouse to detect what stacks your site is built with in order to display additional stack-specific audit suggestions.

## To upload a new stack pack

1. Add a new stack pack file to the `packs/` directory. This file needs to include a few exported properties:

```javascript
module.exports = {
  id: ..., // ID
  iconDataURL: ..., // SVG encoded icon
  title: ..., // title string
  descriptions: {
    // specify any relevant audit descriptions here
  },
};
```

2. Import your new stack pack in `index.js` in this directory:

```javascript
const stackPacks = [
  //...
  require('./packs/new-stack-pack.js'),
];
```

3. Add new stack pack to included packs in `lighthouse-core/lib/stack-packs.js`:

```javascript
const stackPacksToInclude = [
  //...
  {
    packId: ..., // stack pack ID
    requiredStacks: ..., // array of stacks that need to be detected in order to surface stack pack
  },
];
```

## FAQs

* Make sure that library detections are present for your stack. Most detections currently live in [Library-Detector-for-Chrome](https://github.com/johnmichel/Library-Detector-for-Chrome/blob/master/library/libraries.js) which is used by Lighthouse, but you can write your own custom detection if this Chrome extension can not be leveraged.
* Parsing error on your SVG? Make sure you escape `#` into `%23`.