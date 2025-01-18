# Understanding the Results

The result object contains all the audit information Lighthouse determined about the page. In fact, everything you see in the HTML report, even the screenshots, is a rendering of information contained in the result object. You might need to work directly with the result object if you use [Lighthouse programmatically](https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md#using-programmatically), consume the JSON output of the [CLI](https://github.com/GoogleChrome/lighthouse#using-the-node-cli), explore [Lighthouse results in HTTPArchive](https://github.com/GoogleChrome/lighthouse#lighthouse-integrations), or work on the report generation code that reads the Lighthouse JSON and outputs HTML.

## Lighthouse Result Object (LHR)

The top-level Lighthouse Result object (LHR) is what the lighthouse node module returns and the entirety of the JSON output of the CLI. It contains some metadata about the run and the results in the various subproperties below.

For an always up-to-date definition of the LHR, take a look [at our typedefs](https://github.com/GoogleChrome/lighthouse/blob/main/types/lhr/lhr.d.ts).

### Properties

| Name | Description |
| - | - |
| lighthouseVersion | The version of Lighthouse with which this result was generated. |
| fetchTime | The ISO-8601 timestamp of when the result was generated. |
| userAgent | The user agent string of the version of Chrome that was used by Lighthouse. |
| requestedUrl | The URL that was supplied to Lighthouse and initially navigated to. |
| mainDocumentUrl | The URL of the main document request during the final page navigation. |
| finalDisplayedUrl | The URL displayed on the page after all redirects, history API updates, etc. |
| [audits](#audits) | An object containing the results of the audits. |
| [configSettings](#config-settings) | An object containing information about the configuration used by Lighthouse. |
| [timing](#timing) | An object containing information about how long Lighthouse spent auditing. |
| [categories](#categories) | An object containing the different categories, their scores, and references to the audits that comprise them. |
| [categoryGroups](#category-groups) | An object containing the display groups of audits for the report. |
| runtimeError | An object `{code: string, message: string};` providing a top-level error message that, if present, indicates a serious enough problem that this Lighthouse result may need to be discarded. |
| runWarnings | Array of top-level warnings for this Lighthouse run. |

### Example
```json
{
  "lighthouseVersion": "5.1.0",
  "fetchTime": "2019-05-05T20:50:54.185Z",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3358.0 Safari/537.36",
  "requestedUrl": "http://example.com",
  "mainDocumentUrl": "https://www.example.com/",
  "finalDisplayedUrl": "https://www.example.com/",
  "audits": {...},
  "configSettings": {...},
  "timing": {...},
  "categories": {...},
  "categoryGroups": {...},
}
```


<a name="audits"></a>
## `audits`

An object containing the results of the audits, keyed by their name.

### Audit Properties
| Name | Type | Description |
| -- | -- | -- |
| id  | `string` | The string identifier of the audit in kebab case.  |
| title | `string` | The display name of the audit. The text can change depending on if the audit passed or failed. It may contain markdown code. |
| description | `string` | A more detailed description that describes why the audit is important and links to Lighthouse documentation on the audit, markdown links supported. |
| explanation | <code>string&#124;undefined</code> | A string indicating the reason for audit failure. |
| warnings | <code>string[]&#124;undefined</code> | Messages identifying potentially invalid cases |
| errorMessage | <code>string&#124;undefined</code> | A message set |
| numericValue | <code>number&#124;undefined</code> | The unscored value determined by the audit. Typically this will match the score if there's no additional information to impart. For performance audits, this value is typically a number indicating the metric value. |
| displayValue | <code>string&#124;undefined</code> | The string to display in the report alongside audit results. If empty, nothing additional is shown. This is typically used to explain additional information such as the number and nature of failing items. |
| score | <code>number&#124;null</code> | The scored value determined by the audit provided in the numeric range `0-1`, or null if `scoreDisplayMode` indicates not scored. |
| scoreDisplayMode | <code>"binary" &#124; "numeric" &#124; "error" &#124; "manual" &#124; "notApplicable" &#124; "informative"</code> | A string identifying how the score should be interpreted for display i.e. is the audit pass/fail (score of 1 or 0), did it fail, should it be ignored, or are there shades of gray (scores between 0-1 inclusive). If set as `informative`, `notApplicable`, `manual`, or `error`, then `score` will be null and should be ignored. |
| details | `Object` | Extra information found by the audit necessary for display. The structure of this object varies from audit to audit. The [structure of this object](https://github.com/GoogleChrome/lighthouse/blob/main/types/lhr/audit-details.d.ts) is somewhat stable between minor version bumps as this object is used to render the HTML report. |


### Example
```json
{
  "is-on-https": {
      "id": "is-on-https",
      "title": "Does not use HTTPS",
      "description": "All sites should be protected with HTTPS, even ones that don't handle sensitive data. HTTPS prevents intruders from tampering with or passively listening in on the communications between your app and your users, and is a prerequisite for HTTP/2 and many new web platform APIs. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/https).",
      "score": 0,
      "scoreDisplayMode": "binary",
      "displayValue": "1 insecure request found",
      "details": {
        "type": "table",
        "headings": [
          {
            "key": "url",
            "valueType": "url",
            "label": "Insecure URL"
          }
        ],
        "items": [
          {
            "url": "http://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"
          }
        ]
      }
    },
  },
  "custom-audit": {
    "name": "custom-audit",
    ...
  }
}
```


<a name="config-settings"></a>
## `configSettings`

An object containing information about the configuration used by Lighthouse.

### Example
```json
{
  "output": [
    "json"
  ],
  "maxWaitForLoad": 45000,
  "throttlingMethod": "devtools",
  "throttling": {
    "rttMs": 150,
    "throughputKbps": 1638.4,
    "requestLatencyMs": 562.5,
    "downloadThroughputKbps": 1474.5600000000002,
    "uploadThroughputKbps": 675,
    "cpuSlowdownMultiplier": 4
  },
  "gatherMode": false,
  "disableStorageReset": false,
  "formFactor": "mobile",
  "blockedUrlPatterns": null,
  "additionalTraceCategories": null,
  "extraHeaders": null,
  "onlyAudits": null,
  "onlyCategories": null,
  "skipAudits": null
}
```

<a name="timing"></a>
## `timing`

An object containing information about how long Lighthouse spent auditing.

### Properties
| Name | Type | Description |
| -- | -- | -- |
| total | `number` | The total time spent in milliseconds loading the page and evaluating audits. |

### Example
```json
{
  "total": 32189
}
```

<a name="categories"></a>
## `categories`

An array containing the different categories, their scores, and the results of the audits in the categories.

### CategoryEntry Properties
| Name | Type | Description |
| -- | -- | -- |
| id | `string` | The string identifier of the category. |
| title | `string` | The human-friendly display name of the category. |
| description | `string` | A brief description of the purpose of the category, supports markdown links. |
| score | `number` | The overall score of the category, the weighted average of all its audits. |
| auditRefs | `AuditEntry[]` | An array of all the audit results in the category. |

### AuditEntry Properties
| Name | Type | Description |
| -- | -- | -- |
| id | `string` | The string identifier of the category. |
| weight | `number` | The weight of the audit's score in the overall category score. |
| group | `string` |  |

### Example
```json
{
  "seo": {
    "id": "seo",
    "title": "SEO",
    "description": "These checks ensure that your page is following basic search engine optimization advice...",
    "score": 0.54,
    "auditRefs": [
      {
        "id": "crawlable-anchors",
        "weight": 1
      }
    ]
  }
}
```

<a name="category-groups"></a>
## `categoryGroups`

An object containing the display groups of audits for the report, keyed by the group ID found in the config.

### GroupEntry Properties
| Name | Type | Description |
| -- | -- | -- |
| title | `string` | The title of the display group. |
| description | `string` | A brief description of the purpose of the display group. |

### Example
```json
{
  "metrics": {
    "title": "Metrics",
    "description": "These metrics are super cool."
  },
}
```
