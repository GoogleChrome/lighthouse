/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare global {
  module LH.Protocol {
    /**
     * Union of raw (over the wire) message format of all possible Crdp events,
     * of the form `{method: 'Domain.event', params: eventPayload}`.
     */
    export type RawEventMessage = RawEventMessageRecord[keyof RawEventMessageRecord];

    /**
     * Raw (over the wire) message format of all possible Crdp command responses.
     */
    export type RawCommandMessage = {
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
    export type RawMessage = RawCommandMessage | RawEventMessage;

    /**
     * A more strictly-typed EventEmitter interface that checks the association
     * of event name and listener payload. TEventRecord should be a record mapping
     * event names to tuples that can contain zero or more items, which will
     * serve as the arguments to event listener callbacks.
     * Inspired by work from https://github.com/bterlson/strict-event-emitter-types.
     */
    export type StrictEventEmitter<TEventRecord extends Record<keyof TEventRecord, any[]>> = {
      on<E extends keyof TEventRecord>(event: E, listener: (...args: TEventRecord[E]) => void): void;

      addListener<E extends keyof TEventRecord>(event: E, listener: (...args: TEventRecord[E]) => void): void;

      removeListener<E extends keyof TEventRecord>(event: E, listener: Function): void;

      removeAllListeners<E extends keyof TEventRecord>(event?: E): void;

      once<E extends keyof TEventRecord>(event: E, listener: (...args: TEventRecord[E]) => void): void;

      emit<E extends keyof TEventRecord>(event: E, ...request: TEventRecord[E]): void;
    }
  }
}

/**
 * An intermediate type, used to create a record of all possible Crdp raw event
 * messages, keyed on method. e.g. {
 *   'Domain.method1Name': {method: 'Domain.method1Name', params: EventPayload1},
 *   'Domain.method2Name': {method: 'Domain.method2Name', params: EventPayload2},
 * }
 */
type RawEventMessageRecord = {
  [K in keyof LH.CrdpEvents]: {
    method: K,
    // Drop [] for `undefined` (so a JS value is valid).
    params: LH.CrdpEvents[K] extends [] ? undefined: LH.CrdpEvents[K][number]
    // If sessionId is not set, it means the event was from the root target.
    sessionId?: string;
  };
}

// empty export to keep file a module
export {}
