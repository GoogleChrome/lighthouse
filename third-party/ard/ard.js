/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';
import validateAiCatalog from './schema-validator.js';

// Strict URN Regex matching urn:air:<publisher>:<namespace>:<agent-name>
const URN_REGEX = /^urn:air:([a-zA-Z0-9.-]+)(?::([a-zA-Z0-9._:-]+))?:([a-zA-Z0-9._-]+)$/;

/**
 * @typedef {{
 *   element: string,
 *   message: string,
 * }} ValidationError
 */

class ConformanceTester {
    constructor() {
        /** @type {ValidationError[]} */
        this.errors = [];
        /** @type {ValidationError[]} */
        this.warnings = [];
    }

    /**
     * @param {string} message
     * @param {string} [element='Root']
     */
    add_error(message, element = 'Root') {
        this.errors.push({element, message});
        log.verbose('ARD', `Validation Error [${element}]: ${message}`);
    }

    /**
     * @param {string} message
     * @param {string} [element='Root']
     */
    add_warning(message, element = 'Root') {
        this.warnings.push({element, message});
        log.verbose('ARD', `Validation Warning [${element}]: ${message}`);
    }

    /** @param {any} manifest_data */
    run_json_schema_validation(manifest_data) {
        try {
            const valid = validateAiCatalog(manifest_data);

            if (valid) {
                log.verbose('ARD', 'Strict JSON Schema validation passed.');
                return true;
            } else {
                const errors = /** @type {any} */ (validateAiCatalog).errors;
                const e = errors?.[0];
                const propertyPath = e?.instancePath ? e.instancePath.replace(/^\//, '').replace(/\//g, '.') : 'root';
                let msg = e?.message || 'unknown schema error';
                if (e?.keyword === 'required') {
                     msg = `'${e.params.missingProperty}' is a required property`;
                }
                this.add_error(`JSON Schema Validation Failed: ${msg} at path '${propertyPath}'`, 'Root');
                return false;
            }
        } catch (e) {
            this.add_warning(`Failed to run JSON Schema validator: ${e}`, 'Root');
            return true;
        }
    }

    /**
     * @param {string} raw_content
     * @param {string} source_label
     */
    validate_manifest(raw_content, source_label) {
        log.verbose('ARD', `Validating Manifest: ${source_label}`);

        // 1. Basic JSON Parsing
        let data;
        try {
            data = JSON.parse(raw_content);
            log.verbose('ARD', 'Manifest parsed successfully as valid JSON.');
        } catch (e) {
            this.add_error(`Malformed JSON in manifest: ${e}`, 'Root');
            return false;
        }

        // 2. Strict JSON Schema Validation
        this.run_json_schema_validation(data);

        // 3. Custom Semantic and Protocol-Specific Validation
        log.verbose('ARD', 'Running custom semantic checks...');

        const spec_ver = data["specVersion"];
        if (!spec_ver) {
            this.add_error("Missing required 'specVersion' root property.", 'Root');
        } else if (spec_ver !== "1.0") {
            this.add_warning(`Unrecognized 'specVersion': ${spec_ver}. Expected '1.0'.`, 'Root');
        }

        const entries = data["entries"];
        if (entries === undefined || entries === null) {
            this.add_error("Missing required 'entries' array.", 'Root');
            return false;
        } else if (!Array.isArray(entries)) {
            this.add_error("'entries' must be a JSON array.", 'Root');
            return false;
        }

        log.verbose('ARD', `Found ${entries.length} entries to validate.`);
        entries.forEach((entry, idx) => {
            const label = entry["displayName"] || entry["identifier"] || `Entry #${idx}`;

            // Required properties
            const ident = entry["identifier"];
            if (!ident) {
                this.add_error("Missing required 'identifier'.", label);
            } else {
                // URN pattern checks
                const match = URN_REGEX.exec(ident);
                if (!match) {
                    this.add_error(`Identifier '${ident}' does not match RFC 8141 URN pattern 'urn:air:<publisher>:<namespace>:<agent-name>'.`, label);
                } else {
                    const publisher = match[1];
                    const name = match[3];
                    log.verbose('ARD', `[${label}] Valid URN format. Publisher: '${publisher}', Name: '${name}'.`);
                }
            }

            const disp_name = entry["displayName"];
            if (!disp_name) {
                this.add_error("Missing required 'displayName'.", label);
            }

            const media_type = entry["type"];
            if (!media_type) {
                this.add_error("Missing required 'type' (mediaType).", label);
            } else {
                const valid_types = [
                    "application/ai-catalog+json",
                    "application/agent-card+json",
                    "application/a2a-agent-card+json",
                    "application/mcp-server-card+json",
                    "application/agent-skills+zip",
                    "application/agent-skills+gzip",
                    "text/markdown; profile=\"urn:air:agent-skills\"",
                    "application/ai-registry",
                    "application/ai-registry+json"
                ];
                if (!valid_types.includes(media_type)) {
                    this.add_warning(`Media type '${media_type}' is not one of standard discovery types: ${valid_types}.`, label);
                }
            }

            // Strict Value-or-Reference checks
            const has_url = entry["url"] !== undefined;
            const has_data = entry["data"] !== undefined;
            if (has_url && has_data) {
                this.add_error("Constraint violation: both 'url' and 'data' are provided. MUST provide exactly one.", label);
            } else if (!has_url && !has_data) {
                this.add_error("Constraint violation: neither 'url' nor 'data' is provided. MUST provide exactly one.", label);
            }

            // Custom constraints for representativeQueries
            const queries = entry["representativeQueries"];
            if (queries === undefined || queries === null) {
                this.add_warning("Missing 'representativeQueries'. 2 to 5 queries are recommended for vector index embedding.", label);
            } else if (!Array.isArray(queries)) {
                this.add_error("'representativeQueries' must be an array of strings.", label);
            } else {
                if (queries.length < 2 || queries.length > 5) {
                    this.add_warning(`'representativeQueries' array has size ${queries.length}. 2 to 5 queries are recommended for vector index embedding.`, label);
                }
                for (const q of queries) {
                    if (typeof q !== 'string') {
                        this.add_error(`Query '${q}' is not a string.`, label);
                    }
                }
            }

            // Progressive trust checks
            const trust = entry["trustManifest"];
            if (trust !== undefined && trust !== null) {
                if (typeof trust !== 'object' || Array.isArray(trust)) {
                    this.add_error("'trustManifest' must be a JSON object.", label);
                } else {
                    const trust_id = trust["identity"];
                    if (!trust_id) {
                        this.add_error("'trustManifest' is missing required 'identity' field.", label);
                    }
                }
            }
        });

        // Top-level deprecated property check
        if ("collections" in data) {
            this.add_error("Deprecated field check: Found 'collections' array at root. Top-level collections were REMOVED in ADR-0003. Catalog hierarchies MUST be modeled inside 'entries' using 'type: application/ai-catalog+json'.", 'Root');
        }

        return this.errors.length === 0;
    }
}

export { ConformanceTester };
