/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import process from 'process';
import {EventEmitter} from 'events';

import debug from 'debug';

const isWindows = process.platform === 'win32';

// Capture the high resolution clock at module load, so later replacements of the global
// (e.g. by fake timers in tests) don't affect timing. `performance` is available in both
// Node and browsers; fall back to `Date.now` just in case.
const perf = globalThis.performance;
/** @type {() => number} */
const now = perf && typeof perf.now === 'function' ? () => perf.now() : () => Date.now();

/**
 * Start times of in-progress timings, keyed by id.
 * @type {Map<string, number>}
 */
let timeMarks = new Map();
/**
 * Completed timings, sorted by startTime.
 * @type {PerformanceEntry[]}
 */
let timeEntries = [];

/**
 * @param {string} id
 */
function markStart(id) {
  timeMarks.set(id, now());
}

/**
 * @param {string} id
 */
function markEnd(id) {
  const endTime = now();
  const startTime = timeMarks.get(id);
  if (startTime === undefined) {
    throw new Error(`no known mark: ${id}`);
  }

  const entry = /** @type {PerformanceEntry} */ ({
    name: id,
    entryType: 'measure',
    startTime,
    duration: endTime - startTime,
  });

  // Insert after any existing entries with the same or earlier startTime, keeping the list sorted.
  let index = timeEntries.length;
  while (index > 0 && timeEntries[index - 1].startTime > startTime) index--;
  timeEntries.splice(index, 0, entry);
}

// @ts-expect-error: process.browser is set via bundler.
const isBrowser = Boolean(process.browser);

const colors = {
  red: isBrowser ? 'crimson' : 1,
  yellow: isBrowser ? 'gold' : 3,
  cyan: isBrowser ? 'darkturquoise' : 6,
  green: isBrowser ? 'forestgreen' : 2,
  blue: isBrowser ? 'steelblue' : 4,
  magenta: isBrowser ? 'palevioletred' : 5,
};

// allow non-red/yellow colors for debug()
// @ts-expect-error - `colors` is not declared in @types/debug.
debug.colors = [colors.cyan, colors.green, colors.blue, colors.magenta];

class Emitter extends EventEmitter {
  // yarn build-types fails without this!
  // https://github.com/microsoft/TypeScript/issues/41672#issuecomment-2303803072
  /**
   * @param {ConstructorParameters<typeof EventEmitter>[0]} [options]
   */
  constructor(options) {
    super(options);
  }

  /**
   * Fires off all status updates. Listen with
   * `log.events.addListener('status', callback)`
   * @param {string} title
   * @param {Array<any>} argsArray
   */
  issueStatus(title, argsArray) {
    if (title === 'status' || title === 'statusEnd') {
      this.emit(title, [title, ...argsArray]);
    }
  }

  /**
   * Fires off all warnings. Listen with
   * `log.events.addListener('warning', callback)`
   * @param {string} title
   * @param {Array<any>} argsArray
   */
  issueWarning(title, argsArray) {
    this.emit('warning', [title, ...argsArray]);
  }
}

/** @type {Record<string, debug.Debugger>} */
const loggersByTitle = {};
const loggingBufferColumns = 25;
/** @type {string|undefined} */
let level_;

class Log {
  static events = new Emitter();

  /**
   * @param {string} title
   * @param {Array<any>} argsArray
   */
  static _logToStdErr(title, argsArray) {
    const log = Log.loggerfn(title);
    log(argsArray[0], ...argsArray.slice(1));
  }

  /**
   * @param {string} title
   * @return {debug.Debugger}
   */
  static loggerfn(title) {
    title = `LH:${title}`;
    let log = loggersByTitle[title];
    if (!log) {
      log = debug(title);
      loggersByTitle[title] = log;
      // errors with red, warnings with yellow.
      if (title.endsWith('error')) {
        // @ts-expect-error - debug accepts numeric ANSI codes in Node.
        log.color = colors.red;
      } else if (title.endsWith('warn')) {
        // @ts-expect-error - debug accepts numeric ANSI codes in Node.
        log.color = colors.yellow;
      }
    }
    return log;
  }

  /**
   * @param {string} level
   */
  static setLevel(level) {
    level_ = level;
    switch (level) {
      case 'silent':
        debug.enable('-LH:*');
        break;
      case 'verbose':
        debug.enable('LH:*');
        break;
      case 'warn':
        debug.enable('-LH:*, LH:*:warn, LH:*:error');
        break;
      case 'error':
        debug.enable('-LH:*, LH:*:error');
        break;
      default:
        debug.enable('LH:*, -LH:*:verbose');
    }
  }

  /**
   * A simple formatting utility for event logging.
   * @param {string} prefix
   * @param {{method?: string, params?: Record<string, any>}} data A JSON-serializable object of event data to log.
   * @param {string=} level Optional logging level. Defaults to 'log'.
   */
  static formatProtocol(prefix, data, level) {
    const columns = (!process || isBrowser) ? Infinity : process.stdout.columns;
    const method = data.method || '?????';
    const maxLength = columns - method.length - prefix.length - loggingBufferColumns;
    // IO.read ignored here to avoid logging megabytes of trace data
    const snippet = (data.params && method !== 'IO.read') ?
      JSON.stringify(data.params).slice(0, maxLength) : '';
    Log._logToStdErr(`${prefix}:${level || ''}`, [method, snippet]);
  }

  /**
   * @return {boolean}
   */
  static isVerbose() {
    return level_ === 'verbose';
  }

  /**
   * @param {{msg: string, id: string, args?: any[]}} status
   * @param {'log'|'verbose'|'warn'|'error'} [level]
   */
  static time({msg, id, args = []}, level = 'log') {
    markStart(id);
    Log[level]('status', msg, ...args);
  }

  /**
   * @param {{msg: string, id: string, args?: any[]}} status
   * @param {'log'|'verbose'|'warn'|'error'} [level]
   */
  static timeEnd({msg, id, args = []}, level = 'verbose') {
    Log[level]('statusEnd', msg, ...args);
    markEnd(id);
  }

  /**
   * @param {string} title
   * @param {...any} args
   */
  static log(title, ...args) {
    Log.events.issueStatus(title, args);
    return Log._logToStdErr(title, args);
  }

  /**
   * @param {string} title
   * @param {...any} args
   */
  static warn(title, ...args) {
    Log.events.issueWarning(title, args);
    return Log._logToStdErr(`${title}:warn`, args);
  }

  /**
   * @param {string} title
   * @param {...any} args
   */
  static error(title, ...args) {
    return Log._logToStdErr(`${title}:error`, args);
  }

  /**
   * @param {string} title
   * @param {...any} args
   */
  static verbose(title, ...args) {
    Log.events.issueStatus(title, args);
    return Log._logToStdErr(`${title}:verbose`, args);
  }

  /**
   * Add surrounding escape sequences to turn a string green when logged.
   * @param {string} str
   * @return {string}
   */
  static greenify(str) {
    return `${Log.green}${str}${Log.reset}`;
  }

  /**
   * Add surrounding escape sequences to turn a string red when logged.
   * @param {string} str
   * @return {string}
   */
  static redify(str) {
    return `${Log.red}${str}${Log.reset}`;
  }

  static get green() {
    return '\x1B[32m';
  }

  static get red() {
    return '\x1B[31m';
  }

  static get purple() {
    return '\x1b[95m';
  }

  static get reset() {
    return '\x1B[0m';
  }

  static get bold() {
    return '\x1b[1m';
  }

  static get dim() {
    return '\x1b[2m';
  }

  static get tick() {
    return isWindows ? '\u221A' : '✓';
  }

  static get cross() {
    return isWindows ? '\u00D7' : '✘';
  }

  /**
   * @return {PerformanceEntry[]}
   */
  static takeTimeEntries() {
    const entries = timeEntries;
    timeMarks = new Map();
    timeEntries = [];
    return entries;
  }

  /**
   * @return {PerformanceEntry[]}
   */
  static getTimeEntries() {
    return [...timeEntries];
  }
}

export default Log;
