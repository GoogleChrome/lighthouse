/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const INITIAL_CONGESTION_WINDOW = 10;
const TCP_SEGMENT_SIZE = 1460;

class TcpConnection {
  /**
   * @param {number} rtt
   * @param {number} throughput
   * @param {number=} serverLatency
   * @param {boolean=} ssl
   * @param {boolean=} h2
   */
  constructor(rtt, throughput, serverLatency = 0, ssl = true, h2 = false) {
    this._warmed = false;
    this._ssl = ssl;
    this._h2 = h2;
    this._rtt = rtt;
    this._throughput = throughput;
    this._serverLatency = serverLatency;
    this._congestionWindow = INITIAL_CONGESTION_WINDOW;
    this._h2OverflowBytesDownloaded = 0;
  }

  /**
   * @param {number} rtt
   * @param {number} availableThroughput
   * @return {number}
   */
  static maximumSaturatedConnections(rtt, availableThroughput) {
    const roundTripsPerSecond = 1000 / rtt;
    const bytesPerRoundTrip = TCP_SEGMENT_SIZE;
    const bytesPerSecond = roundTripsPerSecond * bytesPerRoundTrip;
    const minimumThroughputRequiredPerRequest = bytesPerSecond * 8;
    return Math.floor(availableThroughput / minimumThroughputRequiredPerRequest);
  }

  /**
   * @return {number}
   */
  _computeMaximumCongestionWindowInSegments() {
    const bytesPerSecond = this._throughput / 8;
    const secondsPerRoundTrip = this._rtt / 1000;
    const bytesPerRoundTrip = bytesPerSecond * secondsPerRoundTrip;
    return Math.floor(bytesPerRoundTrip / TCP_SEGMENT_SIZE);
  }

  /**
   * @param {number} throughput
   */
  setThroughput(throughput) {
    this._throughput = throughput;
  }

  /**
   * @param {number} congestion
   */
  setCongestionWindow(congestion) {
    this._congestionWindow = congestion;
  }

  /**
   * @param {boolean} warmed
   */
  setWarmed(warmed) {
    this._warmed = warmed;
  }

  /**
   * @return {boolean}
   */
  isWarm() {
    return this._warmed;
  }

  /**
   * @return {boolean}
   */
  isH2() {
    return this._h2;
  }

  /**
   * @return {number}
   */
  get congestionWindow() {
    return this._congestionWindow;
  }

  /**
   * Sets the number of excess bytes that are available to this connection on future downloads, only
   * applies to H2 connections.
   * @param {number} bytes
   */
  setH2OverflowBytesDownloaded(bytes) {
    if (!this._h2) return;
    this._h2OverflowBytesDownloaded = bytes;
  }

  /**
   * @return {TcpConnection}
   */
  clone() {
    return Object.assign(new TcpConnection(this._rtt, this._throughput), this);
  }

  /**
   * Simulates a network download of a particular number of bytes over an optional maximum amount of time
   * and returns information about the ending state.
   *
   * See https://hpbn.co/building-blocks-of-tcp/#three-way-handshake and
   *  https://hpbn.co/transport-layer-security-tls/#tls-handshake for details.
   *
   * @param {number} bytesToDownload
   * @param {DownloadOptions} [options]
   * @return {DownloadResults}
   */
  simulateDownloadUntil(bytesToDownload, options) {
    const {timeAlreadyElapsed = 0, maximumTimeToElapse = Infinity, dnsResolutionTime = 0} =
      options || {};

    if (this._warmed && this._h2) {
      bytesToDownload -= this._h2OverflowBytesDownloaded;
    }
    const twoWayLatency = this._rtt;
    const oneWayLatency = twoWayLatency / 2;
    const maximumCongestionWindow = this._computeMaximumCongestionWindowInSegments();

    let handshakeAndRequest = oneWayLatency;
    if (!this._warmed) {
      handshakeAndRequest =
        // DNS lookup
        dnsResolutionTime +
        // SYN
        oneWayLatency +
        // SYN ACK
        oneWayLatency +
        // ACK + initial request
        oneWayLatency +
        // ClientHello/ServerHello assuming TLS False Start is enabled (https://istlsfastyet.com/#server-performance).
        (this._ssl ? twoWayLatency : 0);
    }

    let roundTrips = Math.ceil(handshakeAndRequest / twoWayLatency);
    let timeToFirstByte = handshakeAndRequest + this._serverLatency + oneWayLatency;
    if (this._warmed && this._h2) timeToFirstByte = 0;

    const timeElapsedForTTFB = Math.max(timeToFirstByte - timeAlreadyElapsed, 0);
    const maximumDownloadTimeToElapse = maximumTimeToElapse - timeElapsedForTTFB;

    let congestionWindow = Math.min(this._congestionWindow, maximumCongestionWindow);
    let totalBytesDownloaded = 0;
    if (timeElapsedForTTFB > 0) {
      totalBytesDownloaded = congestionWindow * TCP_SEGMENT_SIZE;
    } else {
      roundTrips = 0;
    }

    let downloadTimeElapsed = 0;
    let bytesRemaining = bytesToDownload - totalBytesDownloaded;
    while (bytesRemaining > 0 && downloadTimeElapsed <= maximumDownloadTimeToElapse) {
      roundTrips++;
      downloadTimeElapsed += twoWayLatency;
      congestionWindow = Math.max(Math.min(maximumCongestionWindow, congestionWindow * 2), 1);

      const bytesDownloadedInWindow = congestionWindow * TCP_SEGMENT_SIZE;
      totalBytesDownloaded += bytesDownloadedInWindow;
      bytesRemaining -= bytesDownloadedInWindow;
    }

    const timeElapsed = timeElapsedForTTFB + downloadTimeElapsed;
    const extraBytesDownloaded = this._h2 ? Math.max(totalBytesDownloaded - bytesToDownload, 0) : 0;
    const bytesDownloaded = Math.max(Math.min(totalBytesDownloaded, bytesToDownload), 0);

    return {
      roundTrips,
      timeElapsed,
      bytesDownloaded,
      extraBytesDownloaded,
      congestionWindow,
    };
  }
}

module.exports = TcpConnection;

/**
 * @typedef DownloadOptions
 * @property {number} [dnsResolutionTime]
 * @property {number} [timeAlreadyElapsed]
 * @property {number} [maximumTimeToElapse]
 */

/**
 * @typedef DownloadResults
 * @property {number} roundTrips
 * @property {number} timeElapsed
 * @property {number} bytesDownloaded
 * @property {number} extraBytesDownloaded
 * @property {number} congestionWindow
 */
