# Lighthouse Report Generator

## Overview

Lighthouse's report generator is the entry point for creating reports from an **LHR** (Lighthouse Result object). It returns results as HTML, JSON, and CSV.

It runs natively in Node.js but can run in the browser after a compile step is applied during our bundling pipeline. That compile step uses `inline-fs`, which takes any `fs.readFileSync()` calls and replaces them with the stringified file content.

Because it's shared between core and the report, dependencies (both code and types) should be kept minimal.
