/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A minimal Sentry client that sends events with `fetch` using Sentry's envelope protocol.
 * See https://develop.sentry.dev/sdk/data-model/envelopes/
 */

import os from 'os';
import path from 'path';
import {types} from 'util';

import log from './lighthouse-logger.js';

/** @typedef {'fatal'|'error'|'warning'|'log'|'info'|'debug'} SeverityLevel */
/** @typedef {{message?: string, category?: string, level?: SeverityLevel, data?: Record<string, any>, timestamp?: number}} Breadcrumb */
/** @typedef {{release?: string, environment?: string, serverName?: string}} EnvironmentData */
/** @typedef {{level?: SeverityLevel, tags?: Record<string, any>, extra?: Record<string, any>, fingerprint?: string[]}} CaptureOptions */

const MAX_BREADCRUMBS = 100;
const MAX_FRAMES = 50;
const MAX_LINKED_ERRORS = 5;
const SEND_TIMEOUT_MS = 5000;

// Same as @sentry/node's stack line parser so frames (and issue grouping) stay similar.
const FRAME_RE = /at (?:async )?(?:(.+?)\s+\()?(?:(.+):(\d+):(\d+)?|([^)]+))\)?/;

/**
 * Same as @sentry/core: drop any Windows drive letter and use forward slashes.
 * @param {string} p
 */
function normalizePath(p) {
  return p.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/');
}

const BASE_PATH = normalizePath(process.argv[1] ? path.dirname(process.argv[1]) : process.cwd());

/**
 * Same as @sentry/node's module naming, e.g. `core.lib:sentry` or `puppeteer-core.lib:foo`.
 * @param {string} filename
 */
function getModule(filename) {
  const {dir, name} = path.posix.parse(normalizePath(filename));
  const nodeModulesIndex = dir.lastIndexOf('/node_modules');
  if (nodeModulesIndex > -1) {
    return `${dir.slice(nodeModulesIndex + 14).replace(/\//g, '.')}:${name}`;
  }
  if (dir === BASE_PATH || dir.startsWith(`${BASE_PATH}/`)) {
    const moduleName = dir.slice(BASE_PATH.length + 1).replace(/\//g, '.');
    return moduleName ? `${moduleName}:${name}` : name;
  }
  return name;
}

/**
 * Parses a V8 stack into Sentry frames, oldest call first.
 * @param {unknown} stack
 */
function parseStack(stack) {
  if (typeof stack !== 'string') return [];

  const frames = [];
  const lines = stack.split('\n').filter(line => /^\s+at /.test(line)).slice(0, MAX_FRAMES);
  for (const line of lines) {
    const match = FRAME_RE.exec(line);
    if (!match) continue;

    let filename = match[2] || match[5];
    if (filename.startsWith('file://')) {
      filename = filename.slice(7);
      // `file:///C:/foo.js` -> `C:/foo.js`
      if (/^\/[A-Za-z]:/.test(filename)) filename = filename.slice(1);
      try {
        filename = decodeURI(filename);
      } catch {}
    }
    const slashFilename = filename.replace(/\\/g, '/');
    const isAbsolute = slashFilename.startsWith('/') || /^[A-Za-z]:\//.test(slashFilename);
    const inApp = isAbsolute && !slashFilename.includes('/node_modules/');

    frames.push({
      filename,
      module: getModule(filename),
      function: match[1] || '<anonymous>',
      lineno: match[3] ? Number(match[3]) : undefined,
      colno: match[4] ? Number(match[4]) : undefined,
      in_app: inApp,
    });
  }
  return frames.reverse();
}

/**
 * @param {unknown} value
 * @return {value is Error}
 */
function isError(value) {
  // `isNativeError` also handles errors from other realms (e.g. `vm` contexts).
  return value instanceof Error || types.isNativeError(value);
}

/**
 * @param {unknown} err
 */
function exceptionValues(err) {
  const values = [];
  /** @type {unknown} */
  let current = err;
  while (isError(current) && values.length < MAX_LINKED_ERRORS) {
    values.push({
      type: current.name,
      value: current.message,
      stacktrace: {frames: parseStack(current.stack)},
    });
    current = current.cause;
  }
  // Non-Error throwables (strings, plain objects, ...).
  if (!values.length) {
    const message = err && typeof err === 'object' && 'message' in err ? err.message : err;
    values.push({type: 'Error', value: String(message)});
  }
  // Sentry expects the root cause first, and the captured error last.
  return values.reverse();
}

/**
 * A JSON.stringify replacer that handles values that would otherwise throw or be lost.
 * Based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
 */
function safeJsonReplacer() {
  /** @type {unknown[]} */
  const ancestors = [];
  /**
   * @this {unknown}
   * @param {string} key
   * @param {unknown} value
   */
  return function(key, value) {
    if (typeof value === 'bigint') return String(value);
    if (value instanceof Error) {
      value = {name: value.name, message: value.message, stack: value.stack};
    }
    if (typeof value !== 'object' || value === null) return value;

    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) ancestors.pop();
    if (ancestors.includes(value)) return '[Circular]';
    ancestors.push(value);
    return value;
  };
}

/**
 * @param {string} dsn
 * @param {EnvironmentData} environmentData
 */
function createSentryReporter(dsn, environmentData) {
  const sdkVersion = environmentData.release;
  const {protocol, username: publicKey, host, pathname} = new URL(dsn);
  const endpoint = `${protocol}//${host}/api/${pathname.slice(1)}/envelope/`;
  const auth = `Sentry sentry_version=7, sentry_key=${publicKey}, ` +
    `sentry_client=lighthouse/${sdkVersion}`;

  /** @type {Record<string, any>} */
  const tags = {};
  /** @type {Record<string, any>} */
  const extra = {};
  /** @type {Record<string, any>} */
  const contexts = {
    os: {name: os.type(), version: os.release()},
    runtime: {name: 'node', version: process.version},
  };
  /** @type {Breadcrumb[]} */
  const breadcrumbs = [];

  /**
   * Never throws: a failure to report an error must not affect Lighthouse.
   * @param {() => Record<string, any>} getEvent
   * @param {CaptureOptions} opts
   * @return {Promise<void>}
   */
  async function send(getEvent, opts) {
    try {
      const eventId = crypto.randomUUID().replace(/-/g, '');
      const fullEvent = {
        event_id: eventId,
        timestamp: Date.now() / 1000,
        platform: 'node',
        level: opts.level,
        release: environmentData.release,
        environment: environmentData.environment,
        server_name: environmentData.serverName,
        tags: {...tags, ...opts.tags},
        extra: {...extra, ...opts.extra},
        contexts,
        breadcrumbs,
        fingerprint: opts.fingerprint,
        sdk: {name: 'lighthouse', version: sdkVersion},
        ...getEvent(),
      };
      const envelope = [
        JSON.stringify({event_id: eventId, sent_at: new Date().toISOString()}),
        JSON.stringify({type: 'event'}),
        JSON.stringify(fullEvent, safeJsonReplacer()),
      ].join('\n');

      await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-sentry-envelope', 'X-Sentry-Auth': auth},
        body: envelope,
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
    } catch (err) {
      log.verbose('sentry', `Failed to send event: ${err}`);
    }
  }

  return {
    /** @param {Record<string, any>} newTags */
    setTags(newTags) {
      Object.assign(tags, newTags);
    },
    /** @param {Record<string, any>} newExtras */
    setExtras(newExtras) {
      Object.assign(extra, newExtras);
    },
    /**
     * @param {string} name
     * @param {Record<string, any>|null} context
     */
    setContext(name, context) {
      if (context) contexts[name] = context;
      else delete contexts[name];
    },
    /** @param {Breadcrumb} breadcrumb */
    addBreadcrumb(breadcrumb) {
      breadcrumbs.push({timestamp: Date.now() / 1000, ...breadcrumb});
      if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.shift();
    },
    /**
     * @param {string} message
     * @param {SeverityLevel|CaptureOptions=} levelOrOpts
     */
    captureMessage(message, levelOrOpts) {
      const opts = typeof levelOrOpts === 'string' ? {level: levelOrOpts} : levelOrOpts;
      return send(() => ({message}), {...opts, level: opts?.level || 'info'});
    },
    /**
     * @param {unknown} err
     * @param {CaptureOptions=} opts
     */
    captureException(err, opts) {
      const getEvent = () => ({exception: {values: exceptionValues(err)}});
      return send(getEvent, {...opts, level: opts?.level || 'error'});
    },
  };
}

export {
  createSentryReporter,
  parseStack,
};
