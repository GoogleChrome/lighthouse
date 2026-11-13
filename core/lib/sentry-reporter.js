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
import url from 'url';

import log from 'lighthouse-logger';

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
const BASE_PATH = process.argv[1] ? path.dirname(process.argv[1]) : process.cwd();

/**
 * Same as @sentry/node's module naming, e.g. `core.lib:sentry` or `puppeteer-core.lib:foo`.
 * @param {string} filename
 */
function getModule(filename) {
  const {dir, name} = path.posix.parse(filename);
  const nodeModulesIndex = dir.lastIndexOf('/node_modules');
  if (nodeModulesIndex > -1) {
    return `${dir.slice(nodeModulesIndex + 14).replace(/\//g, '.')}:${name}`;
  }
  if (dir.startsWith(BASE_PATH)) {
    const moduleName = dir.slice(BASE_PATH.length + 1).replace(/\//g, '.');
    return moduleName ? `${moduleName}:${name}` : name;
  }
  return name;
}

/**
 * Parses a V8 stack into Sentry frames, oldest call first.
 * @param {string|undefined} stack
 */
function parseStack(stack = '') {
  const frames = [];
  const lines = stack.split('\n').filter(line => /^\s+at /.test(line)).slice(0, MAX_FRAMES);
  for (const line of lines) {
    const match = FRAME_RE.exec(line);
    if (!match) continue;

    let filename = match[2] || match[5];
    if (filename.startsWith('file://')) filename = url.fileURLToPath(filename);
    const inApp = filename.startsWith('/') && !filename.includes('/node_modules/');

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
 * @param {Error} err
 */
function exceptionValues(err) {
  const values = [];
  /** @type {unknown} */
  let current = err;
  while (current instanceof Error && values.length < MAX_LINKED_ERRORS) {
    values.push({
      type: current.name,
      value: current.message,
      stacktrace: {frames: parseStack(current.stack)},
    });
    current = current.cause;
  }
  // Sentry expects the root cause first, and the captured error last.
  return values.reverse();
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
   * @param {Record<string, any>} event
   * @param {CaptureOptions} opts
   * @return {Promise<void>}
   */
  async function send(event, opts) {
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
      ...event,
    };
    const envelope = [
      JSON.stringify({event_id: eventId, sent_at: new Date().toISOString()}),
      JSON.stringify({type: 'event'}),
      JSON.stringify(fullEvent),
    ].join('\n');

    try {
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
     * @param {SeverityLevel=} level
     */
    captureMessage(message, level = 'info') {
      return send({message}, {level});
    },
    /**
     * @param {Error} err
     * @param {CaptureOptions} opts
     */
    captureException(err, opts = {}) {
      const event = {exception: {values: exceptionValues(err)}};
      return send(event, {...opts, level: opts.level || 'error'});
    },
  };
}

export {
  createSentryReporter,
  parseStack,
};
