# Lighthouse Scores

## How is the Performance score calculated?

➡️ Please read [Lighthouse Performance Scoring at developer.chrome.com](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/).

## How is the Best Practices score calculated?

All audits in the Best Practices category are equally weighted. Therefore, implementing each audit correctly will increase your overall score by ~6 points.

## How is the SEO score calculated?

All audits in the SEO category are [equally weighted](https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js#:~:text=%7D%2C-,%27seo%27%3A,-%7B), with the exception of Structured Data, which is an unscored manual audit. Therefore, implementing each audit correctly will increase your overall score by ~8 points.


## How is the accessibility score calculated?

<!-- To regnerate score weights, run `node core/scripts/print-a11y-scoring.js`-->

The accessibility score is a weighted average. The specific weights for v7 are as follows:

(See the [v6 scoring explanation](https://github.com/GoogleChrome/lighthouse/blob/v6.5.0/docs/scoring.md#how-is-the-accessibility-score-calculated))

| audit id | weight |
|-|-|
 | aria-allowed-attr | 4.1% |
 | aria-hidden-body | 4.1% |
 | aria-required-attr | 4.1% |
 | aria-required-children | 4.1% |
 | aria-required-parent | 4.1% |
 | aria-roles | 4.1% |
 | aria-valid-attr-value | 4.1% |
 | aria-valid-attr | 4.1% |
 | button-name | 4.1% |
 | duplicate-id-aria | 4.1% |
 | image-alt | 4.1% |
 | input-image-alt | 4.1% |
 | label | 4.1% |
 | meta-refresh | 4.1% |
 | meta-viewport | 4.1% |
 | video-caption | 4.1% |
 | accesskeys | 1.2% |
 | aria-command-name | 1.2% |
 | aria-hidden-focus | 1.2% |
 | aria-input-field-name | 1.2% |
 | aria-meter-name | 1.2% |
 | aria-progressbar-name | 1.2% |
 | aria-toggle-field-name | 1.2% |
 | aria-tooltip-name | 1.2% |
 | aria-treeitem-name | 1.2% |
 | bypass | 1.2% |
 | color-contrast | 1.2% |
 | definition-list | 1.2% |
 | dlitem | 1.2% |
 | document-title | 1.2% |
 | duplicate-id-active | 1.2% |
 | frame-title | 1.2% |
 | html-has-lang | 1.2% |
 | html-lang-valid | 1.2% |
 | link-name | 1.2% |
 | list | 1.2% |
 | listitem | 1.2% |
 | object-alt | 1.2% |
 | tabindex | 1.2% |
 | td-headers-attr | 1.2% |
 | th-has-data-cells | 1.2% |
 | valid-lang | 1.2% |
 | form-field-multiple-labels | 0.8% |
 | heading-order | 0.8% |

Each audit is a pass/fail, meaning there is no room for partial points for getting an audit half-right. For example, that means if half your buttons have screenreader friendly names, and half do not, you don't get "half" of the weighted average - you get a 0 because it needs to be implemented correctly *throughout* the page.
