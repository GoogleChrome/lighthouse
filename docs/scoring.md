# Lighthouse Scores

## How is the Performance score calculated?

➡️ Please read [Lighthouse Performance Scoring at developer.chrome.com](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/).

## How is the Best Practices score calculated?

All audits in the Best Practices category are equally weighted. Therefore, implementing each audit correctly will increase your overall score by ~6 points.

## How is the SEO score calculated?

All audits in the SEO category are [equally weighted](https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js#:~:text=%7D%2C-,%27seo%27%3A,-%7B), with the exception of Structured Data, which is an unscored manual audit. Therefore, implementing each audit correctly will increase your overall score by ~8 points.


## How is the accessibility score calculated?

<!-- To regnerate score weights, run `node core/scripts/print-a11y-scoring.js`-->

The accessibility score is a weighted average. Lighthouse's accessibility scoring and weights can change between major versions as audits are added, removed, or re-weighted. For the most up-to-date explanation of how accessibility scoring works, and the canonical list of audit weights, see the Lighthouse Accessibility Scoring guide on developer.chrome.com:

https://developer.chrome.com/docs/lighthouse/accessibility/scoring

If you need the weights for a specific release of Lighthouse you can also generate them locally from the configuration with:

```bash
node core/scripts/print-a11y-scoring.js
```

Each audit is a pass/fail check for the page under test. That means a single audit contributes its full weight if it passes on the current page, or zero if it fails. For example, if an audit's weight is 4% and the audit fails for the inspected page, the page loses that 4 points from the accessibility category score.
