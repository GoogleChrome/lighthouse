# Plugin Handbook

## Table of Contents

1. [Introduction](#introduction)
   1. [What is a Lighthouse Plugin?](#what-is-a-lighthouse-plugin)
   1. [Comparing a Plugin vs. Custom Config](#comparing-a-plugin-vs-custom-config)
   1. [Getting Started](#getting-started)
1. [API](#api)
   1. [Plugin Config](#plugin-config)
   1. [Plugin Audits](#plugin-audits)
1. [Best Practices](#best-practices)
   1. [Naming](#naming)
   1. [Scoring](#scoring)
   1. [Common Mistakes](#common-mistakes)
1. [Examples](#examples)

## Introduction

If you're new to Lighthouse development, start by reading up on the overall [architecture](./architecture.md), how [configuration](./configuration.md) works, and what makes a [good audit](./new-audits.md) before continuing.

### What is a Lighthouse Plugin?

Lighthouse plugins are a way to extend the functionality of Lighthouse with insight from domain experts (that's you!) and easily share this extra functionality with other Lighthouse users. At its core, a plugin is a node module that implements a set of checks that will be run by Lighthouse and added to the report as a new category.

![picture of Lighthouse plugin results in the HTML report](https://user-images.githubusercontent.com/2301202/57053947-24fc9b80-6c57-11e9-8853-df3a174fcf2c.png)

### Comparing a Plugin vs. Custom Config

Plugins are easily shared and have a stable API that won't change between minor version bumps but are also more limited in scope than a [custom Lighthouse configuration](./configuration.md). Before getting started with plugins, think about your current needs, and consult the table below to decide which is best for you.

| Capability                                   | Plugin | Custom Config |
| -------------------------------------------- | ------ | ------------- |
| Include your own custom audits               | ✅     | ✅            |
| Add a custom category                        | ✅     | ✅            |
| Easily shareable and extensible on NPM       | ✅     | ❌            |
| Semver-stable API                            | ✅     | ❌            |
| Gather custom data from the page (artifacts) | ❌     | ✅            |
| Modify core categories                       | ❌     | ✅            |
| Modify `config.settings` properties          | ❌     | ✅            |

### Getting Started

To develop a Lighthouse plugin, you'll need to write three things:

1. A `package.json` file to define your plugin's dependencies and point to your `plugin.js` file.
1. A `plugin.js` file to declare your plugin's audits, category name, and scoring.
1. Custom audit files that will contain the primary logic of the checks you want to perform.

To see a fully functioning example, see our [plugin recipe](./recipes/lighthouse-plugin-example/readme.md) or its [GitHub repository template](https://github.com/GoogleChrome/lighthouse-plugin-example).

#### `package.json`

A Lighthouse plugin is just a node module with a name that starts with `lighthouse-plugin-`. Any dependencies you need are up to you. However, do not depend on Lighthouse directly, use [`peerDependencies`](http://npm.github.io/using-pkgs-docs/package-json/types/peerdependencies.html) to alert dependents, and `devDependencies` for your own local development:

**Example `package.json`**

```json
{
  "name": "lighthouse-plugin-example",
  "type": "module",
  "main": "plugin.js",
  "peerDependencies": {
    "lighthouse": "^12.3.0"
  },
  "devDependencies": {
    "lighthouse": "^12.3.0"
  }
}
```

#### `plugin.js`

This file contains the configuration for your plugin. It can be called anything you like, just ensure it is referenced by the `"main"` property in your `package.json`.

**Example `plugin.js`**

```js
export default {
  // Additional audits to run on information Lighthouse gathered.
  audits: [{path: 'lighthouse-plugin-example/audits/has-cat-images.js'}],

  // A new category in the report for the plugin output.
  category: {
    title: 'Cats',
    description:
      'When integrated into your website effectively, cats deliver delight and bemusement.',
    auditRefs: [{id: 'has-cat-images-id', weight: 1}],
  },
};
```

#### Custom Audits

These files contain the logic that will generate results for the Lighthouse report. An audit is a class with two important properties:

1. `meta` - This contains important information about how the audit will be referenced and how it will be displayed in the HTML report.
2. `audit` - This is a function that should return the audit's results. See [API > Plugin Audits](#plugin-audits).

**Example `audits/has-cat-images.js`**

```js
import {Audit} from 'lighthouse';

class CatAudit extends Audit {
  static get meta() {
    return {
      id: 'has-cat-images-id',
      title: 'Page has least one cat image',
      failureTitle: 'Page does not have at least one cat image',
      description:
        'Pages should have lots of cat images to keep users happy. ' +
        'Consider adding a picture of a cat to your page improve engagement.',
      requiredArtifacts: ['ImageElements'],
    };
  }

  static audit(artifacts) {
    // Artifacts requested in `requiredArtifacts` above are passed to your audit.
    // See the "API -> Plugin Audits" section below for what artifacts are available.
    const images = artifacts.ImageElements;
    const catImages = images.filter(image => image.src.toLowerCase().includes('cat'));

    return {
      // Give users a 100 if they had a cat image, 0 if they didn't.
      score: catImages.length > 0 ? 1 : 0,
      // Also return the total number of cat images that can be used by report JSON consumers.
      numericValue: catImages.length,
    };
  }
}

export default CatAudit;
```

#### Run the plugin locally in development

```sh
# be in your plugin directory, and have lighthouse as a devDependency.
NODE_PATH=.. npx lighthouse -- https://example.com --plugins=lighthouse-plugin-example --only-categories=lighthouse-plugin-example --view
# Note: we add the parent directory to NODE_PATH as a hack to allow Lighthouse to find this plugin.
# This is useful for local development, but is not necessary when your plugin consuming from NPM as
# a node module.
```

## API

### Plugin Config

The plugin config file (see `plugin.js` in the [example](#pluginjs) and [recipe](./recipes/lighthouse-plugin-example/plugin.js)) is a subset of the available [configuration](./configuration.md) for full custom Lighthouse config files.

A plugin config is an object that has at least two properties: `audits` and `category`.

#### `audits`

Defines the new audits the plugin adds. It is an array of string paths to the audit files. Each path should be treated as an absolute string a user of your module might pass to `require`, so use paths of the form `lighthouse-plugin-<your plugin>/path/to/audits/audit-file.js`.

**Type**: `Array<{path: string}>`

#### `category`

Defines the display strings of the plugin's category and configures audit scoring and grouping. It is an object with at least two properties `title` and `auditRefs`.

- `title: string` **REQUIRED** - The display name of the plugin's category in the report.
- `description: string` _OPTIONAL_ - A more detailed description of the category's purpose.
- `manualDescription: string` _OPTIONAL_ - A more detailed description of all of the manual audits in a plugin. Only use this if you've added manual audits.
- `auditRefs: Array<{id: string, weight: number, group?: string}>` **REQUIRED** - The list of audits to include in the plugin category along with their overall weight in the score of the plugin category. Each audit ref may optionally reference a group ID from `groups`.
- `supportedModes: string[]` _OPTIONAL_ - Which Lighthouse [modes](https://github.com/GoogleChrome/lighthouse/blob/master/docs/user-flows.md) this plugin supports. Category will support all modes if this is not provided.

#### `groups`

Defines the audit groups used for display in the HTML report.

It is an object whose keys are the group IDs and whose values are objects with the following properties:

- `title: string` **REQUIRED** - The display name of the group in the report.
- `description: string` _OPTIONAL_ - A more detailed description of the group's purpose.

**Example of Category with Groups**

<img alt="audit group with groups" src="https://user-images.githubusercontent.com/2301202/56936017-86d3ce80-6aba-11e9-9a43-39bf3810b551.png" width=550>

**Example of Category _without_ Groups**

<img alt="audit group without groups" src="https://user-images.githubusercontent.com/2301202/56936043-c0a4d500-6aba-11e9-9e37-0bc131010a37.png" width=550>

### Plugin Audits

A plugin audit is a class that implements at least two properties: `meta` and `audit()`.

#### `meta`

The `meta` property is a static getter for the metadata of an [audit](#custom-audits). It should return an object with the following properties:

- `id: string` **REQUIRED** - The string identifier of the audit, in kebab case, typically matching the file name.
- `title: string` **REQUIRED** - Short, user-visible title for the audit when successful.
- `failureTitle: string` _OPTIONAL_ - Short, user-visible title for the audit when failing.
- `description: string` **REQUIRED** - A more detailed description that describes why the audit is important and links to Lighthouse documentation on the audit; markdown links supported.
- `requiredArtifacts: Array<string>` **REQUIRED** - A list of artifacts that must be present for the audit to execute. See [Available Artifacts](#available-artifacts) for what's available to plugins.
- `scoreDisplayMode: "numeric" | "binary" | "manual" | "informative"` _OPTIONAL_ - A string identifying how the score should be interpreted for display.

See [Best Practices > Naming](#naming) for best practices on the display strings.

#### `audit(artifacts, context)`

The `audit()` property is a function the computes the audit results for the report. It accepts two arguments: `artifacts` and `context`. `artifacts` is an object whose keys will be the values you passed to `requiredArtifacts` in the `meta` object. `context` is an internal object whose primary use in plugins is to derive network request information (see [Using Network Requests](#using-network-requests)).

The primary objective of the audit function is to return a `score` from `0` to `1` based on the data observed in `artifacts`. There are several other properties that can be returned by an audit to control additional display features. For the complete list, see the [audit results documentation](./understanding-results.md#audit-properties) and [type information](https://github.com/GoogleChrome/lighthouse/blob/623b789497f6c87f85d366b4038deae5dc701c90/types/audit.d.ts#L69-L87).

#### Available Artifacts

The following artifacts are available for use in the audits of Lighthouse plugins. For more detailed information on their usage and purpose, see the [type information](https://github.com/GoogleChrome/lighthouse/blob/main/types/artifacts.d.ts#L42-L99).

- `fetchTime`
- `BenchmarkIndex`
- `settings`
- `Timing`
- `HostFormFactor`
- `HostUserAgent`
- `HostProduct`
- `GatherContext`
- `URL`
- `ConsoleMessages`
- `DevtoolsLog`
- `MainDocumentContent`
- `ImageElements`
- `LinkElements`
- `MetaElements`
- `Scripts`
- `Trace`
- `ViewportDimensions`

While Lighthouse has more artifacts with information about the page than are in this list, those artifacts are considered experimental and their structure or existence could change at any time. Only use artifacts not on the list above if you are comfortable living on the bleeding edge and can tolerate unannounced breaking changes.

If you're interested in other page information not mentioned here, please file an issue. We'd love to help.

#### Using Network Requests

You might have noticed that a simple array of network requests is missing from the list above. The source information for network requests made by the page is actually contained in the `DevtoolsLog` artifact, which contains all the of DevTools Protocol traffic recorded during page load. The network request objects are derived from this message log at audit time.

See below for an example of an audit that processes network requests.

```js
import {Audit, NetworkRecords} from 'lighthouse';

class HeaderPoliceAudit {
  static get meta() {
    return {
      id: 'header-police-audit-id',
      title: 'All headers stripped of debug data',
      failureTitle: 'Headers contained debug data',
      description: 'Pages should mask debug data in production.',
      requiredArtifacts: ['DevtoolsLog'],
    };
  }

  static async audit(artifacts, context) {
    // Lighthouse loads the page multiple times: while offline, without javascript, etc.
    // Use the devtools log from the default pass of the page.
    const devtoolsLog = artifacts.DevtoolsLog;
    // Request the network records from the devtools log.
    // The `context` argument is passed in to allow Lighthouse to cache the result and not re-compute the network requests for every audit that needs them.
    const requests = await NetworkRecords.request(devtoolsLog, context);

    // Do whatever you need to with the network requests.
    const badRequests = requests.filter(request =>
      request.responseHeaders.some(header => header.name.toLowerCase() === 'x-debug-data')
    );

    return {
      score: badRequests.length === 0 ? 1 : 0,
    };
  }
}

export default HeaderPoliceAudit;
```

## Best Practices

### Naming

> There are only two hard things in Computer Science: cache invalidation and naming things.
> Phil Karlton

There are several display strings you will need to write in the course of plugin development. To ensure your plugin users have a consistent experience with the rest of the Lighthouse report, follow these guidelines.

#### Category Titles

Write category titles that are short (fewer than 20 characters), ideally a single word or acronym. Avoid unnecessary prefixes like "Lighthouse" or "Plugin" which will already be clear from the context of the report.

#### Category Descriptions

Write category descriptions that provide context for your plugin's audits and link to where users can learn more or ask questions about their advice.

#### Audit Titles

Write audit titles in the _present_ tense that _describe_ what the page is successfully or unsuccessfully doing.

**DO**

> Document has a `<title>` element

> Document does not have a `<title>` element

> Uses HTTPS

> Does not use HTTPS

> Tap targets are sized appropriately

> Tap targets are not sized appropriately

**DON'T**

> Good job on `alt` attributes

> Fix your headers

#### Audit Descriptions

Write audit descriptions that provide brief context for why the audit is important and link to more detailed guides on how to follow its advice. Markdown links are supported, so use them!

**DO**

> Interactive elements like buttons and links should be large enough (48x48px), and have enough space around them, to be easy enough to tap without overlapping onto other elements. [Learn more](https://developers.google.com/web/fundamentals/accessibility/accessible-styles#multi-device_responsive_design).

> All sites should be protected with HTTPS, even ones that don\'t handle sensitive data. HTTPS prevents intruders from tampering with or passively listening in on the communications between your app and your users, and is a prerequisite for HTTP/2 and many new web platform APIs. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/https).

**DON'T**

> Images need alt attributes.

> 4.8.4.4 Requirements for providing text to act as an alternative for images
> Except where otherwise specified, the alt attribute.... 10,000 words later... and that is everything you need to know about the `alt` attribute!

### Scoring

1. Weight each audit by its importance.
1. Differentiate scores within an audit by returning a number _between_ `0` and `1`. Scores greater than `0.9` will be hidden in "Passed Audits" section by default.
1. Avoid inflating scores unnecessarily by marking audits as not applicable. When an audit's advice doesn't apply, simply `return {score: null, notApplicable: true}`.

### Common Mistakes

The web is a diverse place, and your plugin will be run on pages you never thought existed. Here are a few things to keep in mind when writing your audit to avoid common bugs. The Lighthouse team has made all of these mistakes below, so you're in good company!

#### Forgetting to Filter

Most audits will have a specific use case in mind that will apply to most elements or requests, but there are corner cases that come up fairly frequently that are easy to forget.

**Examples:**

- Non-network network requests (`blob:`, `data:`, `file:`, etc)
- Non-javascript scripts (`type="x-shader/x-vertex"`, `type="application/ld+json"`, etc)
- Tracking pixel images (images with size 1x1, 0x0, etc)

#### Forgetting to Normalize

Most artifacts will try to represent as truthfully as possible what was observed from the page. When possible, the values are normalized according to the spec as you would access them from the DOM, but typically no transformation beyond this is done. This means that some values will have leading or trailing whitespace, be mixed-case, potentially missing, relative URLs instead of absolute, etc.

**Examples:**

- Header names and values
- Script `type` values
- Script `src` values

## Examples

- [Cinememe Plugin](https://github.com/exterkamp/lighthouse-plugin-cinememe) - Find and reward dank cinememes (5MB+ animated GIFs ;)
- [YouTube Embed](https://github.com/connorjclark/lighthouse-plugin-yt) - Identifies YouTube embeds
- [Lighthouse Plugin Recipe](./recipes/lighthouse-plugin-example)
- [Field Performance](https://github.com/treosh/lighthouse-plugin-field-performance) - A plugin to gather and display Chrome UX Report field data
- [Publisher Ads Audits](https://github.com/googleads/pub-ads-lighthouse-plugin) - a well-written, but complex, plugin
- [Green Web Foundation](https://github.com/thegreenwebfoundation/lighthouse-plugin-greenhouse) - A plugin to see which domains run on renewable power.
- [requests-content-md5](https://www.npmjs.com/package/lighthouse-plugin-md5) - Generates MD5 hashes from the content of network requests..

