/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jsonschema from 'jsonschema';

// Strict URN Regex matching urn:air:<publisher>:<namespace>:<agent-name>
const URN_REGEX = /^urn:air:([a-zA-Z0-9.-]+)(?::([a-zA-Z0-9._:-]+))?:([a-zA-Z0-9._-]+)$/;

// Colors for beautiful CLI output
const COLOR_RESET = "\x1b[0m";
const COLOR_BOLD = "\x1b[1m";
const COLOR_RED = "\x1b[31m";
const COLOR_GREEN = "\x1b[32m";
const COLOR_YELLOW = "\x1b[33m";
const COLOR_CYAN = "\x1b[36m";

// Suppress console output for Lighthouse integration
const SILENT = true;

/** @param {string} msg */
function print(msg) {
    if (!SILENT) console.log(msg);
}

/** @param {string} title */
function print_header(title) {
    print(`\n${COLOR_BOLD}${COLOR_CYAN}=== ${title} ===${COLOR_RESET}`);
}

/** @param {string} msg */
function print_success(msg) {
    print(`  ${COLOR_GREEN}✓${COLOR_RESET} ${msg}`);
}

/** @param {string} msg */
function print_failure(msg) {
    print(`  ${COLOR_RED}✗${COLOR_RESET} ${msg}`);
}

/** @param {string} msg */
function print_warning(msg) {
    print(`  ${COLOR_YELLOW}⚠${COLOR_RESET} ${msg}`);
}

/** @param {string} msg */
function print_bullet(msg) {
    print(`  • ${msg}`);
}

class ConformanceTester {
    constructor() {
        /** @type {string[]} */
        this.errors = [];
        /** @type {string[]} */
        this.warnings = [];
        this.jsonschema_available = true;
    }

    /** @param {string} msg */
    add_error(msg) {
        this.errors.push(msg);
        print_failure(msg);
    }

    /** @param {string} msg */
    add_warning(msg) {
        this.warnings.push(msg);
        print_warning(msg);
    }

    /** @param {any} manifest_data */
    run_json_schema_validation(manifest_data) {
        if (!this.jsonschema_available) {
            print_warning("Node 'jsonschema' package not installed. Skipping strict JSON Schema check.");
            print_bullet("Tip: Run 'npm install jsonschema' to enable strict schema-level checking.");
            return true;
        }

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const schema_path = path.join(__dirname, 'spec/schemas/ai-catalog.schema.json');
        
        if (!fs.existsSync(schema_path)) {
            print_warning(`Schema file not found at ${schema_path}. Skipping JSON Schema validation.`);
            return true;
        }

        try {
            const schema_data = JSON.parse(fs.readFileSync(schema_path, 'utf8'));
            const validator = new jsonschema.Validator();
            const result = validator.validate(manifest_data, schema_data);
            
            if (result.valid) {
                print_success("Strict JSON Schema validation passed.");
                return true;
            } else {
                const e = result.errors[0];
                const propertyPath = e.path.length > 0 ? e.path.join('.') : 'root';
                // Adjusting ajv/jsonschema message format to match Python jsonschema output
                // Example Python: 'displayName' is a required property
                // Example jsonschema (Node): requires property "displayName"
                let msg = e.message;
                if (e.name === 'required') {
                     msg = `'${e.argument}' is a required property`;
                }
                this.add_error(`JSON Schema Validation Failed: ${msg} at path '${propertyPath}'`);
                return false;
            }
        } catch (e) {
            this.add_warning(`Failed to run JSON Schema validator: ${e}`);
            return true;
        }
    }

    /**
     * @param {string} raw_content
     * @param {string} source_label
     */
    validate_manifest(raw_content, source_label) {
        print_header(`Validating Manifest: ${source_label}`);
        
        // 1. Basic JSON Parsing
        let data;
        try {
            data = JSON.parse(raw_content);
            print_success("Manifest parsed successfully as valid JSON.");
        } catch (e) {
            this.add_error(`Malformed JSON in manifest: ${e}`);
            return false;
        }

        // 2. Strict JSON Schema Validation
        const schema_passed = this.run_json_schema_validation(data);

        // 3. Custom Semantic and Protocol-Specific Validation
        print_bullet("Running custom semantic checks...");
        
        const spec_ver = data["specVersion"];
        if (!spec_ver) {
            this.add_error("Missing required 'specVersion' root property.");
        } else if (spec_ver !== "1.0") {
            this.add_warning(`Unrecognized 'specVersion': ${spec_ver}. Expected '1.0'.`);
        }

        const entries = data["entries"];
        if (entries === undefined || entries === null) {
            this.add_error("Missing required 'entries' array.");
            return false;
        } else if (!Array.isArray(entries)) {
            this.add_error("'entries' must be a JSON array.");
            return false;
        }

        print_bullet(`Found ${entries.length} entries to validate.`);
        entries.forEach((entry, idx) => {
            const label = entry["displayName"] || entry["identifier"] || `Entry #${idx}`;
            print(`\n  ${COLOR_BOLD}Entry: ${label}${COLOR_RESET}`);

            // Required properties
            const ident = entry["identifier"];
            if (!ident) {
                this.add_error(`[${label}] Missing required 'identifier'.`);
            } else {
                // URN pattern checks
                const match = URN_REGEX.exec(ident);
                if (!match) {
                    this.add_error(`[${label}] Identifier '${ident}' does not match RFC 8141 URN pattern 'urn:air:<publisher>:<namespace>:<agent-name>'.`);
                } else {
                    const publisher = match[1];
                    const namespace = match[2];
                    const name = match[3];
                    print_success(`[${label}] Valid URN format. Publisher: '${publisher}', Name: '${name}'.`);
                }
            }

            const disp_name = entry["displayName"];
            if (!disp_name) {
                this.add_error(`[${label}] Missing required 'displayName'.`);
            }

            const media_type = entry["type"];
            if (!media_type) {
                this.add_error(`[${label}] Missing required 'type' (mediaType).`);
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
                    this.add_warning(`[${label}] Media type '${media_type}' is not one of standard discovery types: ${valid_types}.`);
                }
            }

            // Strict Value-or-Reference checks
            const has_url = entry["url"] !== undefined;
            const has_data = entry["data"] !== undefined;
            if (has_url && has_data) {
                this.add_error(`[${label}] Constraint violation: both 'url' and 'data' are provided. MUST provide exactly one.`);
            } else if (!has_url && !has_data) {
                this.add_error(`[${label}] Constraint violation: neither 'url' nor 'data' is provided. MUST provide exactly one.`);
            } else {
                print_success(`[${label}] Correct Value-or-Reference delivery format (using ${has_url ? 'url' : 'data'}).`);
            }

            // Custom constraints for representativeQueries
            const queries = entry["representativeQueries"];
            if (queries !== undefined && queries !== null) {
                if (!Array.isArray(queries)) {
                    this.add_error(`[${label}] 'representativeQueries' must be an array of strings.`);
                } else {
                    if (queries.length < 2 || queries.length > 5) {
                        this.add_warning(`[${label}] 'representativeQueries' array has size ${queries.length}. 2 to 5 queries are recommended for vector index embedding.`);
                    }
                    for (const q of queries) {
                        if (typeof q !== 'string') {
                            this.add_error(`[${label}] Query '${q}' is not a string.`);
                        }
                    }
                }
            }

            // Progressive trust checks
            const trust = entry["trustManifest"];
            if (trust !== undefined && trust !== null) {
                if (typeof trust !== 'object' || Array.isArray(trust)) {
                    this.add_error(`[${label}] 'trustManifest' must be a JSON object.`);
                } else {
                    const trust_id = trust["identity"];
                    if (!trust_id) {
                        this.add_error(`[${label}] 'trustManifest' is missing required 'identity' field.`);
                    }
                }
            }
        });

        // Top-level deprecated property check
        if ("collections" in data) {
            this.add_error("Deprecated field check: Found 'collections' array at root. Top-level collections were REMOVED in ADR-0003. Catalog hierarchies MUST be modeled inside 'entries' using 'type: application/ai-catalog+json'.");
        }

        return this.errors.length === 0;
    }
}

export { ConformanceTester };
