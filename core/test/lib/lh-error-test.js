/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {LighthouseError} from '../../lib/lh-error.js';

/**
 * `LighthouseError.stringifyReplacer` takes just the error value, not the
 * `(key, value)` pair that `JSON.stringify` passes to a replacer, so it must be
 * wrapped before use. This mirrors the production helper in
 * `core/lib/asset-saver.js`.
 * @param {string} key
 * @param {any} value
 */
function errorReplacer(key, value) {
  if (value instanceof Error) return LighthouseError.stringifyReplacer(value);
  return value;
}

describe('LighthouseError', () => {
  describe('#constructor', () => {
    it('sets code, name, message, and a friendlyMessage containing the code', () => {
      const err = new LighthouseError(LighthouseError.errors.NO_FCP);

      expect(err).toBeInstanceOf(LighthouseError);
      expect(err).toBeInstanceOf(Error);
      expect(err.code).toBe('NO_FCP');
      expect(err.name).toBe('LighthouseError');
      // `super(code, options)` makes the raw Error message the code.
      expect(err.message).toBe('NO_FCP');
      // The friendly message is an i18n object, with `errorCode` auto-filled from the code.
      expect(err.friendlyMessage.formattedDefault).toContain('NO_FCP');
      expect(err.friendlyMessage.values).toEqual({errorCode: 'NO_FCP'});
    });

    it('reflects lhrRuntimeError from the error definition', () => {
      const runtimeErr = new LighthouseError(LighthouseError.errors.NO_SPEEDLINE_FRAMES);
      expect(runtimeErr.lhrRuntimeError).toBe(true);

      // NO_LCP omits `lhrRuntimeError`, so the constructor must default it to false.
      const nonRuntimeErr = new LighthouseError(LighthouseError.errors.NO_LCP);
      expect(nonRuntimeErr.lhrRuntimeError).toBe(false);
    });

    it('assigns custom properties and substitutes them into the friendlyMessage', () => {
      const err = new LighthouseError(LighthouseError.errors.ERRORED_DOCUMENT_REQUEST,
          {statusCode: '404'});

      expect(err.statusCode).toBe('404');
      // Custom properties are substituted into the ICU message.
      expect(err.friendlyMessage.formattedDefault).toContain('Status code: 404');
      expect(err.friendlyMessage.values).toEqual({
        errorCode: 'ERRORED_DOCUMENT_REQUEST',
        statusCode: '404',
      });
    });

    it('preserves the cause passed via ErrorOptions', () => {
      const cause = new Error('root cause');
      const err = new LighthouseError(LighthouseError.errors.NO_FCP, undefined, {cause});

      expect(err.cause).toBe(cause);
    });
  });

  describe('.errors', () => {
    it('has a code that matches each registry key', () => {
      for (const [key, definition] of Object.entries(LighthouseError.errors)) {
        expect(definition.code).toBe(key);
      }
    });
  });

  describe('static constants', () => {
    it('exposes the NO_ERROR and UNKNOWN_ERROR sentinels', () => {
      expect(LighthouseError.NO_ERROR).toBe('NO_ERROR');
      expect(LighthouseError.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    });
  });

  describe('#fromProtocolMessage', () => {
    it('returns a LighthouseError when a definition pattern matches', () => {
      const err = LighthouseError.fromProtocolMessage('Tracing.start',
          {message: 'Tracing already started'});

      expect(err).toBeInstanceOf(LighthouseError);
      expect(err.code).toBe('TRACING_ALREADY_STARTED');
    });

    it('falls back to a generic Error when no pattern matches', () => {
      const err = LighthouseError.fromProtocolMessage('Page.navigate',
          {message: 'something unexpected'});

      expect(err).not.toBeInstanceOf(LighthouseError);
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Protocol error (Page.navigate): something unexpected');
      expect(err.protocolMethod).toBe('Page.navigate');
      expect(err.protocolError).toBe('something unexpected');
    });

    it('appends protocolError.data to the fallback message', () => {
      const err = LighthouseError.fromProtocolMessage('Page.navigate',
          {message: 'boom', data: 'extra details'});

      expect(err.message).toBe('Protocol error (Page.navigate): boom (extra details)');
    });
  });

  describe('#stringifyReplacer', () => {
    it('serializes a LighthouseError with only its custom properties', () => {
      const err = new LighthouseError(LighthouseError.errors.ERRORED_DOCUMENT_REQUEST,
          {statusCode: '404'});

      const serialized = LighthouseError.stringifyReplacer(err);

      expect(serialized.sentinel).toBe('__LighthouseErrorSentinel');
      expect(serialized.code).toBe('ERRORED_DOCUMENT_REQUEST');
      // Class-internal fields must not leak into `properties`.
      expect(serialized.properties).toEqual({statusCode: '404'});
      expect(typeof serialized.stack).toBe('string');
    });

    it('serializes a plain Error with the Error sentinel', () => {
      const baseErr = new Error('base failure');
      const serialized = LighthouseError.stringifyReplacer(baseErr);

      expect(serialized.sentinel).toBe('__ErrorSentinel');
      expect(serialized.message).toBe('base failure');
    });

    it('throws on a non-error value', () => {
      expect(() => LighthouseError.stringifyReplacer({notAnError: true})).toThrow();
    });
  });

  describe('#parseReviver', () => {
    it('round-trips a LighthouseError including custom properties', () => {
      const err = new LighthouseError(LighthouseError.errors.ERRORED_DOCUMENT_REQUEST,
          {statusCode: '404'});

      const json = JSON.stringify(err, errorReplacer);
      const revived = JSON.parse(json, LighthouseError.parseReviver);

      expect(revived).toBeInstanceOf(LighthouseError);
      expect(revived).not.toBe(err);
      expect(revived.code).toBe('ERRORED_DOCUMENT_REQUEST');
      // Custom properties survive the round trip.
      expect(revived.statusCode).toBe('404');
      expect(revived.friendlyMessage.formattedDefault).toContain('Status code: 404');
      expect(revived.lhrRuntimeError).toBe(true);
    });

    it('round-trips a plain Error', () => {
      const baseErr = new Error('base failure');

      const json = JSON.stringify(baseErr, errorReplacer);
      const revived = JSON.parse(json, LighthouseError.parseReviver);

      expect(revived).toBeInstanceOf(Error);
      expect(revived).not.toBeInstanceOf(LighthouseError);
      expect(revived.message).toBe('base failure');
      expect(revived.stack).toBe(baseErr.stack);
    });

    it('returns non-sentinel values unchanged', () => {
      const value = {some: 'object'};
      expect(LighthouseError.parseReviver('key', value)).toBe(value);
    });
  });
});
