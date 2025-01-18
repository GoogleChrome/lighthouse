/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jestMock from 'jest-mock';
import * as td from 'testdouble';

import {Sentry} from '../../lib/sentry.js';
import defaultConfig from '../../config/default-config.js';

describe('Sentry', () => {
  let sentryNodeMock;
  let configPayload;
  let originalSentry;

  beforeEach(async () => {
    await td.replaceEsm('@sentry/node', (sentryNodeMock = {
      init: jestMock.fn().mockReturnValue({install: jestMock.fn()}),
      setExtras: jestMock.fn(),
      setTags: jestMock.fn(),
      captureException: jestMock.fn(),
      withScope: (fn) => fn({
        setLevel: () => {},
        setTags: () => {},
        setExtras: () => {},
      }),
    }));

    configPayload = {
      url: 'http://example.com',
      flags: {enableErrorReporting: true},
      environmentData: {},
    };

    // We need to save the Sentry delegate object because every call to `.init` mutates the methods.
    // We want to have a fresh state for every test.
    originalSentry = {...Sentry};

    Sentry._shouldSample = jestMock.fn().mockReturnValue(true);
  });

  afterEach(() => {
    // Reset the methods on the Sentry object, see note above.
    Object.assign(Sentry, originalSentry);
  });

  describe('.init', () => {
    it('should noop when !enableErrorReporting', async () => {
      await Sentry.init({url: 'http://example.com', flags: {}});
      expect(sentryNodeMock.init).not.toHaveBeenCalled();
      await Sentry.init({url: 'http://example.com', flags: {enableErrorReporting: false}});
      expect(sentryNodeMock.init).not.toHaveBeenCalled();
    });

    it('should noop when not picked for sampling', async () => {
      Sentry._shouldSample.mockReturnValue(false);
      await Sentry.init({url: 'http://example.com', flags: {enableErrorReporting: true}});
      expect(sentryNodeMock.init).not.toHaveBeenCalled();
    });

    it('should initialize the Sentry client when enableErrorReporting', async () => {
      await Sentry.init({
        url: 'http://example.com',
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
        environmentData: {},
      });

      expect(sentryNodeMock.init).toHaveBeenCalled();
      expect(sentryNodeMock.setExtras).toHaveBeenCalled();
      expect(sentryNodeMock.setExtras.mock.calls[0][0]).toEqual({
        url: 'http://example.com',
        ...defaultConfig.settings.throttling,
      });
      expect(sentryNodeMock.setTags.mock.calls[0][0]).toEqual({
        channel: 'test',
        formFactor: 'mobile',
        throttlingMethod: 'devtools',
      });
    });
  });

  describe('.captureException', () => {
    it('should forward exceptions to Sentry client', async () => {
      await Sentry.init(configPayload);
      const error = new Error('oops');
      await Sentry.captureException(error);

      expect(sentryNodeMock.captureException).toHaveBeenCalled();
      expect(sentryNodeMock.captureException.mock.calls[0][0]).toBe(error);
    });

    it('should skip expected errors', async () => {
      await Sentry.init(configPayload);
      const error = new Error('oops');
      error.expected = true;
      await Sentry.captureException(error);

      expect(sentryNodeMock.captureException).not.toHaveBeenCalled();
    });

    it('should skip duplicate audit errors', async () => {
      await Sentry.init(configPayload);
      const error = new Error('A');
      await Sentry.captureException(error, {tags: {audit: 'my-audit'}});
      await Sentry.captureException(error, {tags: {audit: 'my-audit'}});

      expect(sentryNodeMock.captureException).toHaveBeenCalledTimes(1);
    });

    it('should still allow different audit errors', async () => {
      await Sentry.init(configPayload);
      const errorA = new Error('A');
      const errorB = new Error('B');
      await Sentry.captureException(errorA, {tags: {audit: 'my-audit'}});
      await Sentry.captureException(errorB, {tags: {audit: 'my-audit'}});

      expect(sentryNodeMock.captureException).toHaveBeenCalledTimes(2);
    });

    it('should skip duplicate gatherer errors', async () => {
      await Sentry.init(configPayload);
      const error = new Error('A');
      await Sentry.captureException(error, {tags: {gatherer: 'my-gatherer'}});
      await Sentry.captureException(error, {tags: {gatherer: 'my-gatherer'}});

      expect(sentryNodeMock.captureException).toHaveBeenCalledTimes(1);
    });
  });
});
