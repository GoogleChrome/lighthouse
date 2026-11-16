/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as jestMock from 'jest-mock';

import {Sentry} from '../../lib/sentry.js';
import {parseStack} from '../../lib/sentry-reporter.js';
import {LighthouseError} from '../../lib/lh-error.js';
import defaultConfig from '../../config/default-config.js';

describe('Sentry', () => {
  let configPayload;
  let originalSentry;
  let originalFetch;
  let fetchMock;

  /** @return {Array<{url: string, headers: Record<string, string>, envelope: any[]}>} */
  function getRequests() {
    return fetchMock.mock.calls.map(([url, {headers, body}]) => {
      return {url, headers, envelope: body.split('\n').map(line => JSON.parse(line))};
    });
  }

  /** @return {any} */
  function getEvents() {
    return getRequests().map(request => request.envelope[2]);
  }

  beforeEach(() => {
    // Never send anything for real.
    originalFetch = globalThis.fetch;
    fetchMock = jestMock.fn().mockResolvedValue({ok: true});
    globalThis.fetch = fetchMock;

    configPayload = {
      url: 'http://example.com',
      flags: {enableErrorReporting: true},
      environmentData: {release: '1.2.3', environment: 'test', serverName: 'redacted'},
    };

    // We need to save the Sentry delegate object because every call to `.init` mutates the methods.
    // We want to have a fresh state for every test.
    originalSentry = {...Sentry};

    Sentry._shouldSample = jestMock.fn().mockReturnValue(true);
  });

  afterEach(() => {
    // Reset the methods on the Sentry object, see note above.
    Object.assign(Sentry, originalSentry);
    globalThis.fetch = originalFetch;
  });

  describe('.init', () => {
    it('should noop when !enableErrorReporting', async () => {
      await Sentry.init({url: 'http://example.com', flags: {}});
      await Sentry.captureException(new Error('oops'));
      await Sentry.init({url: 'http://example.com', flags: {enableErrorReporting: false}});
      await Sentry.captureException(new Error('oops'));
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should noop when not picked for sampling', async () => {
      Sentry._shouldSample.mockReturnValue(false);
      await Sentry.init({url: 'http://example.com', flags: {enableErrorReporting: true}});
      await Sentry.captureException(new Error('oops'));
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should set tags, extras and context when enableErrorReporting', async () => {
      await Sentry.init({
        ...configPayload,
        flags: {
          enableErrorReporting: true,
          formFactor: 'mobile',
          throttlingMethod: 'devtools',
        },
        config: {
          settings: {
            channel: 'test',
          },
        },
      });

      Sentry.setContext('browser', {name: 'Chrome', version: '147.0.7727.116'});
      Sentry.captureBreadcrumb({message: 'Run started', category: 'lifecycle'});
      await Sentry.captureException(new Error('oops'), {tags: {audit: 'foo'}, extra: {a: 1}});

      const [{url, headers}] = getRequests();
      expect(url).toEqual('https://sentry.io/api/174697/envelope/');
      expect(headers['X-Sentry-Auth']).toEqual('Sentry sentry_version=7, ' +
        'sentry_key=a6bb0da87ee048cc9ae2a345fc09ab2e, sentry_client=lighthouse/1.2.3');

      const [event] = getEvents();
      expect(event).toMatchObject({
        platform: 'node',
        level: 'error',
        release: '1.2.3',
        environment: 'test',
        server_name: 'redacted',
        tags: {
          channel: 'test',
          formFactor: 'mobile',
          throttlingMethod: 'devtools',
          audit: 'foo',
        },
        extra: {
          url: 'http://example.com',
          ...defaultConfig.settings.throttling,
          a: 1,
        },
        contexts: {
          browser: {name: 'Chrome', version: '147.0.7727.116'},
          runtime: {name: 'node', version: process.version},
        },
        breadcrumbs: [{message: 'Run started', category: 'lifecycle'}],
      });
      expect(event.event_id).toMatch(/^[0-9a-f]{32}$/);
      expect(event.breadcrumbs[0].timestamp).toEqual(expect.any(Number));
    });
  });

  describe('.captureMessage', () => {
    it('should send a message event', async () => {
      await Sentry.init(configPayload);
      await Sentry.captureMessage('hello', 'warning');

      const [{envelope}] = getRequests();
      expect(envelope[0].event_id).toEqual(envelope[2].event_id);
      expect(envelope[1]).toEqual({type: 'event'});
      expect(envelope[2]).toMatchObject({message: 'hello', level: 'warning'});
    });
  });

  describe('.captureException', () => {
    it('should send exceptions with stack frames', async () => {
      await Sentry.init(configPayload);
      const cause = new Error('root cause');
      const error = new Error('oops', {cause});
      error.extra = {fromError: true};
      await Sentry.captureException(error, {level: 'fatal'});

      const [event] = getEvents();
      expect(event.level).toEqual('fatal');
      expect(event.extra.fromError).toEqual(true);
      expect(event.exception.values.map(v => v.value)).toEqual(['root cause', 'oops']);
      const frames = event.exception.values[1].stacktrace.frames;
      expect(frames[frames.length - 1]).toMatchObject({
        filename: expect.stringMatching(/sentry-test\.js$/),
        lineno: expect.any(Number),
        colno: expect.any(Number),
        in_app: true,
      });
    });

    it('should resolve after the request completes and swallow errors', async () => {
      await Sentry.init(configPayload);
      fetchMock.mockRejectedValue(new Error('network down'));
      await Sentry.captureException(new Error('oops'));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should skip expected errors', async () => {
      await Sentry.init(configPayload);
      const error = new Error('oops');
      error.expected = true;
      await Sentry.captureException(error);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should skip duplicate audit errors', async () => {
      await Sentry.init(configPayload);
      const error = new Error('A');
      await Sentry.captureException(error, {tags: {audit: 'my-audit'}});
      await Sentry.captureException(error, {tags: {audit: 'my-audit'}});

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should still allow different audit errors', async () => {
      await Sentry.init(configPayload);
      const errorA = new Error('A');
      const errorB = new Error('B');
      await Sentry.captureException(errorA, {tags: {audit: 'my-audit'}});
      await Sentry.captureException(errorB, {tags: {audit: 'my-audit'}});

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should skip duplicate gatherer errors', async () => {
      await Sentry.init(configPayload);
      const error = new Error('A');
      await Sentry.captureException(error, {tags: {gatherer: 'my-gatherer'}});
      await Sentry.captureException(error, {tags: {gatherer: 'my-gatherer'}});

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should fingerprint protocol errors by method and normalized message', async () => {
      await Sentry.init(configPayload);
      const error = LighthouseError.fromProtocolMessage('DOM.getDocument', {
        message:
          'Failed to convert response to JSON: CBOR: stack limit exceeded at position 361589',
      });
      await Sentry.captureException(error);

      const [event] = getEvents();
      expect(event.fingerprint).toEqual([
        '{{ default }}',
        'DOM.getDocument',
        'Failed to convert response to JSON: CBOR: stack limit exceeded at position <n>',
      ]);
      expect(event.tags.protocolMethod).toEqual('DOM.getDocument');
    });

    it('should not set a fingerprint for non-protocol errors', async () => {
      await Sentry.init(configPayload);
      await Sentry.captureException(new Error('oops'));

      const [event] = getEvents();
      expect(event.fingerprint).toBeUndefined();
    });
  });

  describe('parseStack', () => {
    it('should parse V8 stacks oldest frame first', () => {
      const stack = [
        'Error: oops',
        'with a second line at foo.js:1:1',
        '    at Runner._run (file:///lh/core/runner.js:10:5)',
        '    at async Object.<anonymous> (/lh/node_modules/pkg/dist/index.js:2:3)',
        '    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)',
        '    at /lh/cli/bin.js:7:9',
      ].join('\n');

      expect(parseStack(stack)).toMatchObject([
        {filename: '/lh/cli/bin.js', function: '<anonymous>', lineno: 7, colno: 9, in_app: true},
        {
          filename: 'node:internal/process/task_queues',
          function: 'process.processTicksAndRejections',
          in_app: false,
        },
        {
          filename: '/lh/node_modules/pkg/dist/index.js',
          module: 'pkg.dist:index',
          function: 'Object.<anonymous>',
          in_app: false,
        },
        {filename: '/lh/core/runner.js', function: 'Runner._run', lineno: 10, colno: 5},
      ]);
    });
  });
});
