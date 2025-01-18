/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ProtocolMapping as CrdpMappings} from 'devtools-protocol/types/protocol-mapping.js';

type CrdpEvents = CrdpMappings.Events;
type CrdpCommands = CrdpMappings.Commands;

declare module Protocol {
  type TargetType = 'page' | 'iframe' | 'worker';

  /**
   * An intermediate type, used to create a record of all possible Crdp raw event
   * messages, keyed on method. e.g. {
   *   'Domain.method1Name': {method: 'Domain.method1Name', params: EventPayload1},
   *   'Domain.method2Name': {method: 'Domain.method2Name', params: EventPayload2},
   * }
   */
  type RawEventMessageRecord = {
    [K in keyof CrdpEvents]: {
      method: K,
      // Drop [] for `undefined` (so a JS value is valid).
      params: CrdpEvents[K] extends [] ? undefined: CrdpEvents[K][number]
      targetType: TargetType;
      // If sessionId is not set, it means the event was from the root target.
      sessionId?: string;
    };
  }

  /**
   * Union of raw (over the wire) message format of all possible Crdp events,
   * of the form `{method: 'Domain.event', params: eventPayload}`.
   */
  type RawEventMessage = RawEventMessageRecord[keyof RawEventMessageRecord];

  /**
   * Raw (over the wire) message format of all possible Crdp command responses.
   */
  type RawCommandMessage = {
    id: number;
    result: CrdpCommands[keyof CrdpCommands]['returnType'];
    error: {
      code: number,
      message: string
    };
  }

  /**
   * Raw (over the wire) message format of all possible Crdp events and command
   * responses.
   */
  type RawMessage = RawCommandMessage | RawEventMessage;

  /**
   * A more strictly-typed EventEmitter interface that checks the association
   * of event name and listener payload. TEventRecord should be a record mapping
   * event names to tuples that can contain zero or more items, which will
   * serve as the arguments to event listener callbacks.
   * Inspired by work from https://github.com/bterlson/strict-event-emitter-types.
   */
  type StrictEventEmitter<TEventRecord extends Record<keyof TEventRecord, unknown[]>> = {
    on<E extends keyof TEventRecord>(event: E, listener: (...args: TEventRecord[E]) => void): void;

    off<E extends keyof TEventRecord>(event: E, listener: Function): void;

    addListener<E extends keyof TEventRecord>(event: E, listener: (...args: TEventRecord[E]) => void): void;

    removeListener<E extends keyof TEventRecord>(event: E, listener: Function): void;

    removeAllListeners<E extends keyof TEventRecord>(event?: E): void;

    once<E extends keyof TEventRecord>(event: E, listener: (...args: TEventRecord[E]) => void): void;

    emit<E extends keyof TEventRecord>(event: E, ...request: TEventRecord[E]): void;

    listenerCount<E extends keyof TEventRecord>(event: E): number;
  }

  /**
   * A constructable StrictEventEmitter.
   */
  interface StrictEventEmitterClass<TEventRecord extends Record<keyof TEventRecord, unknown[]>> {
    new(): StrictEventEmitter<TEventRecord>;
  }
}

export default Protocol;
