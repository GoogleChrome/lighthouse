/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview JavaScript port of the manifest validation in the ARD conformance test
 * (`conformance/bin/conformance-test`, ARD v0.91). See README.md for the pinned upstream commit
 * and the Lighthouse-specific adaptations.
 */

import log from 'lighthouse-logger';
import {ArdManifest as validateArdManifest, ArdEntry as validateArdEntry} from './schema-validator.js';

// Strict URN Regex matching urn:air:<publisher>:<namespace>:<agent-name>
const URN_REGEX = /^urn:air:([a-zA-Z0-9.-]+)(?::([a-zA-Z0-9._:-]+))?:([a-zA-Z0-9._-]+)$/;

// RFC 6838 restricted-name for type/subtype plus RFC 9110 parameters.
const RESTRICTED_NAME = '[0-9A-Za-z][0-9A-Za-z!#$&^_.+\\-]{0,126}';
const TOKEN = "[!#$%&'*+\\-.^_`|~0-9A-Za-z]+";
const QUOTED_STRING = '"(?:[\\t !#-\\[\\]-~]|\\\\[\\t !-~])*"';
const MEDIA_TYPE_REGEX = new RegExp(
    `^(?<type>${RESTRICTED_NAME})/(?<subtype>${RESTRICTED_NAME})` +
    `(?<parameters>(?:[ \\t]*;[ \\t]*${TOKEN}[ \\t]*=[ \\t]*(?:${TOKEN}|${QUOTED_STRING}))*)$`
);
const MEDIA_TYPE_PARAMETER_REGEX = new RegExp(
    `[ \\t]*;[ \\t]*(?<name>${TOKEN})[ \\t]*=[ \\t]*` +
    `(?<value>${TOKEN}|${QUOTED_STRING})`,
    'g'
);

/**
 * @typedef {[string, Array<[string, string]>]} ParsedMediaType
 */

/**
 * @param {string} media_type
 * @return {ParsedMediaType|null}
 */
function parse_media_type(media_type) {
    const match = MEDIA_TYPE_REGEX.exec(media_type);
    if (!match?.groups) {
        return null;
    }

    const base_media_type =
        `${match.groups.type.toLowerCase()}/${match.groups.subtype.toLowerCase()}`;
    /** @type {Array<[string, string]>} */
    const parameters = [...match.groups.parameters.matchAll(MEDIA_TYPE_PARAMETER_REGEX)]
        .map(parameter => /** @type {[string, string]} */ ([
            /** @type {Record<string, string>} */ (parameter.groups).name.toLowerCase(),
            /** @type {Record<string, string>} */ (parameter.groups).value,
        ]))
        // Python sorts (name, value) tuples by code point.
        .sort((a, b) => {
            if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
            if (a[1] !== b[1]) return a[1] < b[1] ? -1 : 1;
            return 0;
        });
    const parameter_names = parameters.map(([name]) => name);
    if (parameter_names.length !== new Set(parameter_names).size) {
        return null;
    }
    return [base_media_type, parameters];
}

/** @param {ParsedMediaType} parsed */
const mediaTypeKey = parsed => JSON.stringify(parsed);

const STANDARD_MEDIA_TYPES = [
    "application/ai-catalog+json",
    "application/agent-card+json",
    "application/a2a-agent-card+json",
    "application/mcp-server-card+json",
    "application/agent-skills+zip",
    "application/agent-skills+gzip",
    'text/markdown; profile="urn:air:agent-skills"',
    "application/ai-registry",
    "application/ai-registry+json",
];
const STANDARD_MEDIA_TYPES_PARSED = STANDARD_MEDIA_TYPES.map(media_type =>
    /** @type {ParsedMediaType} */ (parse_media_type(media_type)));
const STANDARD_MEDIA_TYPE_KEYS = new Set(STANDARD_MEDIA_TYPES_PARSED.map(mediaTypeKey));
const STANDARD_BASE_MEDIA_TYPES = new Set(STANDARD_MEDIA_TYPES_PARSED.map(([base]) => base));
/** @type {Map<string, Map<string, string>>} */
const STANDARD_PARAMETERS_BY_BASE = new Map(STANDARD_MEDIA_TYPES_PARSED.map(
    ([base, parameters]) => [base, new Map(parameters)]));
/** @type {Record<string, string>} */
const DEPRECATED_MEDIA_TYPES = {
    "application/mcp-server+json": "application/mcp-server-card+json",
};

/**
 * Python's `repr()` of the list of standard media types, to keep messages identical to upstream.
 */
const STANDARD_MEDIA_TYPES_REPR = `[${STANDARD_MEDIA_TYPES.map(t => `'${t}'`).join(', ')}]`;

/**
 * Name of the Python type a JSON value would parse to, for messages matching upstream.
 * @param {unknown} value
 * @return {string}
 */
function python_type_name(value) {
    if (value === null) return 'NoneType';
    if (Array.isArray(value)) return 'list';
    if (typeof value === 'boolean') return 'bool';
    if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float';
    if (typeof value === 'object') return 'dict';
    return typeof value;
}

/**
 * @param {unknown} media_type
 * @return {['warning'|'info', string]|null}
 */
function classify_media_type(media_type) {
    if (typeof media_type !== 'string') {
        return [
            "warning",
            `Media type must be a string; got ${python_type_name(media_type)}.`,
        ];
    }

    const parsed_media_type = parse_media_type(media_type);
    if (parsed_media_type === null) {
        return [
            "warning",
            `Media type '${media_type}' is not a valid IANA media type. ` +
            "Expected 'type/subtype' with optional parameters.",
        ];
    }

    const [base_media_type, parameters] = parsed_media_type;
    if (STANDARD_MEDIA_TYPE_KEYS.has(mediaTypeKey(parsed_media_type))) {
        return null;
    }

    const replacement = DEPRECATED_MEDIA_TYPES[base_media_type];
    if (replacement !== undefined) {
        return [
            "warning",
            `Media type '${media_type}' was renamed by ADR-0008. ` +
            `Use '${replacement}'.`,
        ];
    }

    const expected_parameters = STANDARD_PARAMETERS_BY_BASE.get(base_media_type);
    if (STANDARD_BASE_MEDIA_TYPES.has(base_media_type) && expected_parameters) {
        const actual_parameters = new Map(parameters);
        const missing_parameters = [...expected_parameters]
            .filter(([name, value]) => actual_parameters.get(name) !== value)
            .map(([name, value]) => `${name}=${value}`);
        const unrecognized_parameters = parameters
            .filter(([name, value]) => expected_parameters.get(name) !== value)
            .map(([name]) => name);
        const differences = [];
        if (missing_parameters.length) {
            differences.push(
                "missing required parameters: " + missing_parameters.join(", ")
            );
        }
        if (unrecognized_parameters.length) {
            differences.push(
                "unrecognized parameters: " + unrecognized_parameters.join(", ")
            );
        }
        return [
            "warning",
            `Media type '${media_type}' is based on standard discovery type ` +
            `'${base_media_type}' but has ` +
            `${differences.join('; ')}.`,
        ];
    }

    if (base_media_type.startsWith("application/")) {
        return [
            "info",
            `Media type '${media_type}' is a valid application extension media type. ` +
            "ARD permits extension types without core registration.",
        ];
    }

    return [
        "warning",
        `Media type '${media_type}' is not one of standard discovery types: ` +
        `${STANDARD_MEDIA_TYPES_REPR}.`,
    ];
}

/**
 * @param {unknown} value
 * @return {value is Record<string, any>}
 */
function is_object(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Errors reported inside a oneOf/anyOf branch or a `not` are restated by the combinator itself.
const COMBINATOR_BRANCH_REGEX = /\/(?:oneOf|anyOf)\/\d+(?:\/|$)|\/not(?:\/|$)/;

/**
 * Formats the most relevant Ajv error as `<message> at path '<path>'`.
 * @param {Array<any>|null|undefined} errors
 * @return {string}
 */
function format_schema_error(errors) {
    const e = errors?.find(err => !COMBINATOR_BRANCH_REGEX.test(err.schemaPath)) || errors?.[0];
    const propertyPath = e?.instancePath ? e.instancePath.replace(/^\//, '').replace(/\//g, '.') : 'root';
    let msg = e?.message || 'unknown schema error';
    if (e?.keyword === 'required') {
        msg = `'${e.params.missingProperty}' is a required property`;
    }
    return `${msg} at path '${propertyPath}'`;
}

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
        /** @type {ValidationError[]} */
        this.infos = [];
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

    /**
     * @param {string} message
     * @param {string} [element='Root']
     */
    add_info(message, element = 'Root') {
        this.infos.push({element, message});
        log.verbose('ARD', `Validation Info [${element}]: ${message}`);
    }

    /**
     * Validate the manifest as an ArdManifest, then every entry as an ArdEntry.
     * @param {any} manifest_data
     */
    run_json_schema_validation(manifest_data) {
        let ok = true;
        try {
            if (validateArdManifest(manifest_data)) {
                log.verbose('ARD', 'Manifest validates against ArdManifest.');
            } else {
                const errors = /** @type {any} */ (validateArdManifest).errors;
                this.add_error(`ArdManifest validation failed: ${format_schema_error(errors)}`, 'Root');
                ok = false;
            }
        } catch (e) {
            this.add_warning(`Failed to run JSON Schema validator: ${e}`, 'Root');
            return true;
        }

        const entries = is_object(manifest_data) ? manifest_data["entries"] : undefined;
        if (Array.isArray(entries)) {
            let bad = 0;
            entries.forEach((entry, idx) => {
                const label = is_object(entry) ?
                    String(entry["displayName"] || entry["identifier"] || `Entry #${idx}`) :
                    `Entry #${idx}`;
                if (!validateArdEntry(entry)) {
                    const errors = /** @type {any} */ (validateArdEntry).errors;
                    this.add_error(`ArdEntry validation failed: ${format_schema_error(errors)}`, label);
                    bad += 1;
                    ok = false;
                }
            });
            if (!bad) {
                log.verbose('ARD', `All ${entries.length} entries validate against ArdEntry.`);
            }
        }
        return ok;
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

        // Upstream assumes a JSON object here; treat anything else as an empty root so the
        // schema error above is accompanied by the missing 'entries' error instead of a crash.
        const root = is_object(data) ? data : {};

        // ARD requires only 'entries' at the top level (§5.1). Other members are
        // transport-defined and ignored, so their presence is noted, never an error.
        const extra_roots = Object.keys(root).filter(k => k !== "entries");
        if (extra_roots.length) {
            log.verbose('ARD', `Top-level members ignored by ARD (transport-defined): ${extra_roots.sort().join(', ')}.`);
        }

        const entries = root["entries"];
        if (entries === undefined || entries === null) {
            this.add_error("Missing required 'entries' array.", 'Root');
            return false;
        } else if (!Array.isArray(entries)) {
            this.add_error("'entries' must be a JSON array.", 'Root');
            return false;
        }

        log.verbose('ARD', `Found ${entries.length} entries to validate.`);
        entries.forEach((raw_entry, idx) => {
            // Upstream assumes each entry is a JSON object; treat anything else as empty.
            const entry = is_object(raw_entry) ? raw_entry : {};
            const label = String(entry["displayName"] || entry["identifier"] || `Entry #${idx}`);

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
                const diagnostic = classify_media_type(media_type);
                if (diagnostic !== null) {
                    const [severity, message] = diagnostic;
                    if (severity === "info") {
                        this.add_info(message, label);
                    } else {
                        this.add_warning(message, label);
                    }
                }
            }

            // Strict Value-or-Reference checks
            const has_url = "url" in entry;
            const has_data = "data" in entry;
            if (has_url && has_data) {
                this.add_error("Constraint violation: both 'url' and 'data' are provided. MUST provide exactly one.", label);
            } else if (!has_url && !has_data) {
                this.add_error("Constraint violation: neither 'url' nor 'data' is provided. MUST provide exactly one.", label);
            }

            // Custom constraints for representativeQueries (§4.2, §D.2)
            const queries = entry["representativeQueries"];
            if (queries === undefined || queries === null) {
                this.add_warning("No 'representativeQueries'. The semantic index is built from this term, so the entry will not be found by search — it is a valid catalog entry but not a discoverable ARD entry.", label);
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
                if (!is_object(trust)) {
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
        if ("collections" in root) {
            this.add_warning("Found 'collections' at root. Top-level collections were removed in ADR-0003; ARD ignores unrecognized top-level members, so this does not invalidate the manifest, but hierarchies should be modeled inside 'entries'.", 'Root');
        }

        return this.errors.length === 0;
    }
}

export { ConformanceTester, classify_media_type };
