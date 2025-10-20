# Insight audits

Insight audits are a newer class of audits intended to provide
targeted, diagnostic information and actionable examples to help
developers understand and fix problems discovered by Lighthouse. They
are typically displayed in the Performance category and are non-scored
(weight 0) by default.

## When to use an insight audit

- Use an insight audit when you want to surface prioritized,
  example-driven guidance rather than a single pass/fail rule.

- Insight audits are useful for surfacing a table of problematic
  resources, a ranked list of offending nodes, or a short set of
  prioritized suggestions.

## Generating insight audits

When adding new insight audits, you can start off by running:

```bash
yarn generate-insight-audits
```

This will scaffold lightweight audit files for any registered insight
that doesn't yet have an implementation. The generator creates a
standard audit module and wires a reference into the default config so
the audit appears in reports.

## Authoring guidance

 - Audit id and naming: use the `*-insight` suffix for insight audit
   ids (for example `image-delivery-insight`). This is used by report
   rendering and styles to present the audit appropriately.

 - scoreDisplayMode: insight audits are usually informational. Set
   `scoreDisplayMode: 'notApplicable'` or `'informative'` depending on
   whether the audit has a boolean pass state.

 - weight: insight audits are normally added with `weight: 0` in
   `core/config/default-config.js`. If you decide an insight should
   contribute to scoring, choose weights carefully and document the
   rationale.

 - Diagnostics and examples: supply a `details` object with a table,
   list, or node snapshot that demonstrates the issue. Tables are
   commonly used; ensure columns are well-labeled and limited to the
   most actionable fields (url, size, savings, reason).

 - Localization: add UI strings to the appropriate `UIStrings` file and
   use `str_()` when referencing them in the audit implementation.

Examples

- Table-style insight (common): return a `details.type === 'table'`
  with `headings` and `items` describing offending resources. The
  report renderer applies special table styling for `-insight` audits.

- Node snapshot: return `details.type === 'node'` or `node`-based
  details to show a DOM snippet with an explanation.

Testing and iteration

- Add unit tests under `core/audits/insights/` or
  `report/test/renderer` to validate rendering and diagnostic
  contents.

- Use smokehouse fixtures or the `test/` helpers to run the audit
  against example pages and verify the produced LHR contains the
  expected details.

References

- `core/scripts/generate-insight-audits.js` — generator used to
  scaffold insight audits.

- `core/config/default-config.js` — where insight audit refs are
  listed (they live in the Performance category by default).

If you have questions about design or placement of a new insight
audit, open a discussion or PR describing the proposed UX and example
output so the team can review.