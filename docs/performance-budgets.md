# Performance Budgets (budget.json)

Use a [performance budget](https://web.dev/performance-budgets-101/) to assert thresholds for performance metrics. `budget.json` supports three types of budgets:
- Timing budgets: Assert thresholds for time-based performance metrics like First Contentful Paint, Maximum First Input Delay, and Speed Index.
- Resource counts: Assert thresholds for the quantity of resources on a page. These thresholds can be defined per resource type or for the page overall.
- Resource sizes: Assert thresholds for the transfer size of resources on a page. These thresholds can be defined per resource type or for the page overall.

If performance budgets have been configured, the Lighthouse report will include a "Performance Budgets" section.

To make performance budgets a part of your CI process, refer to [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci).

## Usage

Performance budgets are supported in the CLI version of lighthouse. To use:
1. Create a `budget.json` file.
2. When running Lighthouse from the command line, pass the `--budget-path` flag followed by the path to budget file in order to calculate whenever a category is over budget.
```
lighthouse https://youtube.com --budget-path=budget.json
```

## budget.json
The `budget.json` file is an array containing one or more `Budget` objects.

```json
[
  {
    "path": "/*",
    "options": {
       "firstPartyHostnames": ["*.my-site.com", "my-site.cdn.com"]
    },
    "timings": [
      {
        "metric": "interactive",
        "budget": 5000
      },
      {
        "metric": "first-meaningful-paint",
        "budget": 2000
      }
    ],
    "resourceSizes": [
      {
        "resourceType": "total",
        "budget": 500
      },
      {
        "resourceType": "script",
        "budget": 150
      }
    ],
    "resourceCounts": [
      {
        "resourceType": "third-party",
        "budget": 100
      }
    ]
  },
  {
    "options": {
       "firstPartyHostnames": ["*.my-site.com", "my-site.cdn.com"]
    },
    "path": "/checkout",
    "resourceSizes": [
      {
        "resourceType": "script",
        "budget": 200
      }
    ]
  }
]
``` 

## Further Explanation

### Timing Budgets

_Lighthouse 6 & up_

Use the optional `timings` property to define budgets for time-based performance metrics. In this context, budgets are defined in  milliseconds.

```json
"timings": [
   {
         "metric": "interactive",
         "budget": 5000
   }
]
```

Supported timing metrics:

- `first-contentful-paint`
- `first-cpu-idle`
- `interactive`
- `first-meaningful-paint`
- `max-potential-fid`
- `estimated-input-latency`
- `total-blocking-time`
- `speed-index`
- `largest-contentful-paint`
- `cumulative-layout-shift`

### Resource Budgets

Use the optional `resourceSizes` property to define budgets for the *size* of page resources. In this context, budgets are defined in kilobytes.

```json
"resourceSizes": [
   {
      "resourceType": "script",
      "budget": 300
   }
]
```

Use the optional `resourceCounts` property to define budgets for the *quantity* of page resources. In this context, budgets are defined in # of requests.

```json
"resourceCounts": [
   {
      "resourceType": "script",
      "budget": 10
   }
]
```

Budgets can be set for the follow resource types.

*   `document`
*   `font`
*   `image`
*   `media`
*   `other`
*   `script`
*   `stylesheet`
*   `third-party`
*   `total`

### Using the `path` property

_Lighthouse 5.3 & up_

The `path` property indciates the pages that a budget applies to. This string should follow the [robots.txt](https://developers.google.com/search/reference/robots_txt#examples-of-valid-robotstxt-urls) format.

If `path` is not supplied, a budget will apply to all pages.

If a page's URL path matches the `path` property of more than one budget in `budget.json`, then the last matching budget will be applied. As a result, global budgets (e.g. `"path": "/*"`) should be listed first in `budget.json`, followed by the budgets that override the global budget (e.g. `"path": "/blog"`). 

Examples:

```
"path": "/"
```
Result: Matches all URL paths. This is equivalent to writing `"path": "/*"`

```
"path": "/articles"
```
Result: Matches all URL paths starting with `/articles`. For example, `/articles` and `/articles/jun_02_2019.html`

```
"path": "/store/*/details$"
```
Result: Matches `/store/clothes/item123/details` but does not match `/store/details`.

### Identification of third-party resources

_Lighthouse 6 & up_

`options.firstPartyHostnames` can be used to indicate which resources should be considered first-party. Wildcards can optionally be used to match a hostname and all of its subdomains.

If this property is not set, the root domain and all its subdomains are considered first party.

```json
"options": {
   "firstPartyHostnames": ["*.my-site.com", "my-site.cdn.com"]
}
```

Examples:
```
"firstPartyHostnames": ["pets.com"]
```
Result: pets.com is considerated first-party, but fishes.pets.com is not.

```
"firstPartyHostnames": ["*.pets.com"]
```
Result: Both pets.com and fishes.pets.com are considered first party.
