/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A class that maintains a concurrency pool to coordinate many jobs that should
 * only be run `concurrencyLimit` at a time.
 * API inspired by http://bluebirdjs.com/docs/api/promise.map.html, but
 * independent callers of `concurrentMap()` share the same concurrency limit.
 */
class ConcurrentMapper {
  constructor() {
    /** @type {Set<Promise<unknown>>} */
    this._promisePool = new Set();

    /**
     * The limits of all currently running jobs. There will be duplicates.
     * @type {Array<number>}
     */
    this._allConcurrencyLimits = [];

    /**
     * A promise chain used to serialize job acquisition in FIFO order.
     * @type {Promise<void>}
     */
    this._queue = Promise.resolve();
  }

  /**
   * Runs callbackfn on `values` in parallel, at a max of `concurrency` at a
   * time. Resolves to an array of the results or rejects with the first
   * rejected result. Default `concurrency` limit is `Infinity`.
   * @template T, U
   * @param {Array<T>} values
   * @param {(value: T, index: number, array: Array<T>) => Promise<U>} callbackfn
   * @param {{concurrency?: number}} [options]
   * @return {Promise<Array<U>>}
   */
  static async map(values, callbackfn, options) {
    const cm = new ConcurrentMapper();
    return cm.pooledMap(values, callbackfn, options);
  }

  /**
   * Acquires the queue lock so jobs wait for pool capacity in FIFO order.
   * @return {Promise<() => void>}
   */
  _acquireLock() {
    const prevQueue = this._queue;
    let releaseLock = () => {};
    this._queue = new Promise(resolve => {
      releaseLock = resolve;
    });
    return prevQueue.then(() => releaseLock);
  }

  /**
   * Returns whether there are fewer running jobs than the minimum current
   * concurrency limit and the proposed new `concurrencyLimit`.
   * @param {number} concurrencyLimit
   */
  _canRunMoreAtLimit(concurrencyLimit) {
    return this._promisePool.size < concurrencyLimit &&
        this._promisePool.size < Math.min(...this._allConcurrencyLimits);
  }

  /**
   * Add a job to pool.
   * @param {Promise<unknown>} job
   * @param {number} concurrencyLimit
   */
  _addJob(job, concurrencyLimit) {
    this._promisePool.add(job);
    this._allConcurrencyLimits.push(concurrencyLimit);
  }

  /**
   * Remove a job from pool.
   * @param {Promise<unknown>} job
   * @param {number} concurrencyLimit
   */
  _removeJob(job, concurrencyLimit) {
    this._promisePool.delete(job);

    const limitIndex = this._allConcurrencyLimits.indexOf(concurrencyLimit);
    if (limitIndex === -1) {
      throw new Error('No current limit found for finishing job');
    }
    this._allConcurrencyLimits.splice(limitIndex, 1);
  }

  /**
   * Runs callbackfn on `values` in parallel, at a max of `concurrency` at
   * a time across all callers on this instance. Resolves to an array of the
   * results (for each caller separately) or rejects with the first rejected
   * result. Default `concurrency` limit is `Infinity`.
   * @template T, U
   * @param {Array<T>} values
   * @param {(value: T, index: number, array: Array<T>) => Promise<U>} callbackfn
   * @param {{concurrency?: number}} [options]
   * @return {Promise<Array<U>>}
   */
  async pooledMap(values, callbackfn, options = {concurrency: Infinity}) {
    const {concurrency = Infinity} = options;
    if (typeof concurrency !== 'number' || !(concurrency >= 1)) {
      throw new Error(`Invalid concurrency: ${concurrency}`);
    }

    const result = [];

    for (let i = 0; i < values.length; i++) {
      const releaseLock = await this._acquireLock();
      try {
        // Wait until concurrency allows another run.
        while (!this._canRunMoreAtLimit(concurrency)) {
          // Unconditionally catch since we only care about our own failures
          // (caught in the Promise.all below), not other callers.
          await Promise.race(this._promisePool).catch(() => {});
        }

        // innerPromise removes itself from the pool and resolves on return from callback.
        const innerPromise = callbackfn(values[i], i, values)
          .finally(() => this._removeJob(innerPromise, concurrency));
        innerPromise.catch(() => {});

        this._addJob(innerPromise, concurrency);
        result.push(innerPromise);
      } finally {
        releaseLock();
      }
    }

    return Promise.all(result);
  }

  /**
   * Runs `fn` concurrent to other operations in the pool, at a max of
   * `concurrency` at a time across all callers on this instance. Default
   * `concurrency` limit is `Infinity`.
   * @template U
   * @param {() => Promise<U>} fn
   * @param {{concurrency?: number}} [options]
   * @return {Promise<U>}
   */
  async runInPool(fn, options = {concurrency: Infinity}) {
    const {concurrency = Infinity} = options;
    if (typeof concurrency !== 'number' || !(concurrency >= 1)) {
      throw new Error(`Invalid concurrency: ${concurrency}`);
    }

    // Let pooledMap handle the pool management for the cost of boxing a fake `value`.
    const result = await this.pooledMap([''], fn, {concurrency});
    return result[0];
  }
}

export {ConcurrentMapper};
