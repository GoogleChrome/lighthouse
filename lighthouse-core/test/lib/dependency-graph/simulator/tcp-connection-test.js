/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TcpConnection = require('../../../../lib/dependency-graph/simulator/tcp-connection.js');

const assert = require('assert').strict;

/* eslint-env jest */
describe('DependencyGraph/Simulator/TcpConnection', () => {
  describe('#constructor', () => {
    it('should create the connection', () => {
      const rtt = 150;
      const throughput = 1600 * 1024;
      const connection = new TcpConnection(rtt, throughput);
      assert.ok(connection);
      assert.equal(connection._rtt, rtt);
    });
  });

  describe('#maximumSaturatedConnections', () => {
    it('should compute number of supported simulated requests', () => {
      const availableThroughput = 1460 * 8 * 10; // 10 TCP segments/second
      assert.equal(TcpConnection.maximumSaturatedConnections(100, availableThroughput), 1);
      assert.equal(TcpConnection.maximumSaturatedConnections(300, availableThroughput), 3);
      assert.equal(TcpConnection.maximumSaturatedConnections(1000, availableThroughput), 10);
    });
  });

  describe('.setWarmed', () => {
    it('adjusts the time to download appropriately', () => {
      const connection = new TcpConnection(100, Infinity);
      assert.equal(connection.simulateDownloadUntil(0).timeElapsed, 300);
      connection.setWarmed(true);
      assert.equal(connection.simulateDownloadUntil(0).timeElapsed, 100);
    });
  });

  describe('.setCongestionWindow', () => {
    it('adjusts the time to download appropriately', () => {
      const connection = new TcpConnection(100, Infinity);
      assert.deepEqual(connection.simulateDownloadUntil(50000), {
        bytesDownloaded: 50000,
        extraBytesDownloaded: 0,
        congestionWindow: 40,
        roundTrips: 5,
        timeElapsed: 500,
      });
      connection.setCongestionWindow(40); // will download all in one round trip
      assert.deepEqual(connection.simulateDownloadUntil(50000), {
        bytesDownloaded: 50000,
        extraBytesDownloaded: 0,
        congestionWindow: 40,
        roundTrips: 3,
        timeElapsed: 300,
      });
    });
  });

  describe('.setH2OverflowBytesDownloaded', () => {
    it('adjusts the time to download appropriately for H2 connections', () => {
      const connection = new TcpConnection(100, Infinity, 0, true, true);
      connection.setWarmed(true);
      assert.equal(connection.simulateDownloadUntil(30000).timeElapsed, 200);
      connection.setH2OverflowBytesDownloaded(20000);
      assert.equal(connection.simulateDownloadUntil(30000).timeElapsed, 100);
      connection.setH2OverflowBytesDownloaded(50000);
      assert.equal(connection.simulateDownloadUntil(30000).timeElapsed, 0);
    });

    it('does not adjust the time to download for non-H2 connections', () => {
      const connection = new TcpConnection(100, Infinity, 0, true, false);
      connection.setWarmed(true);
      assert.equal(connection.simulateDownloadUntil(30000).timeElapsed, 200);
      connection.setH2OverflowBytesDownloaded(20000);
      assert.equal(connection.simulateDownloadUntil(30000).timeElapsed, 200);
      connection.setH2OverflowBytesDownloaded(50000);
      assert.equal(connection.simulateDownloadUntil(30000).timeElapsed, 200);
    });
  });

  describe('.simulateDownloadUntil', () => {
    describe('when maximumTime is not set', () => {
      it('should provide the correct values small payload non-SSL', () => {
        const connection = new TcpConnection(100, Infinity, 0, false);
        assert.deepEqual(connection.simulateDownloadUntil(7300), {
          bytesDownloaded: 7300,
          extraBytesDownloaded: 0,
          congestionWindow: 10,
          roundTrips: 2,
          timeElapsed: 200,
        });
      });

      it('should provide the correct values small payload SSL', () => {
        const connection = new TcpConnection(100, Infinity, 0, true);
        assert.deepEqual(connection.simulateDownloadUntil(7300), {
          bytesDownloaded: 7300,
          extraBytesDownloaded: 0,
          congestionWindow: 10,
          roundTrips: 3,
          timeElapsed: 300,
        });
      });

      it('should provide the correct values small payload H2', () => {
        const connection = new TcpConnection(100, Infinity, 0, true, true);
        assert.deepEqual(connection.simulateDownloadUntil(7300), {
          bytesDownloaded: 7300,
          extraBytesDownloaded: 7300,
          congestionWindow: 10,
          roundTrips: 3,
          timeElapsed: 300,
        });
      });

      it('should provide the correct values response time', () => {
        const responseTime = 78;
        const connection = new TcpConnection(100, Infinity, responseTime, true);
        assert.deepEqual(connection.simulateDownloadUntil(7300), {
          bytesDownloaded: 7300,
          extraBytesDownloaded: 0,
          congestionWindow: 10,
          roundTrips: 3,
          timeElapsed: 300 + responseTime,
        });
      });

      it('should provide the correct values large payload', () => {
        const connection = new TcpConnection(100, 8 * 1000 * 1000);
        const bytesToDownload = 10 * 1000 * 1000; // 10 mb
        assert.deepEqual(connection.simulateDownloadUntil(bytesToDownload), {
          bytesDownloaded: bytesToDownload,
          extraBytesDownloaded: 0,
          congestionWindow: 68,
          roundTrips: 105,
          timeElapsed: 10500,
        });
      });

      it('should provide the correct values resumed small payload', () => {
        const connection = new TcpConnection(100, Infinity, 0, true);
        assert.deepEqual(connection.simulateDownloadUntil(7300, {timeAlreadyElapsed: 250}), {
          bytesDownloaded: 7300,
          extraBytesDownloaded: 0,
          congestionWindow: 10,
          roundTrips: 3,
          timeElapsed: 50,
        });
      });

      it('should provide the correct values resumed small payload H2', () => {
        const connection = new TcpConnection(100, Infinity, 0, true, true);
        connection.setWarmed(true);
        connection.setH2OverflowBytesDownloaded(10000);
        assert.deepEqual(connection.simulateDownloadUntil(7300), {
          bytesDownloaded: 0,
          extraBytesDownloaded: 2700, // 10000 - 7300
          congestionWindow: 10,
          roundTrips: 0,
          timeElapsed: 0,
        });
      });

      it('should provide the correct values resumed large payload', () => {
        const connection = new TcpConnection(100, 8 * 1000 * 1000);
        const bytesToDownload = 5 * 1000 * 1000; // 5 mb
        connection.setCongestionWindow(68);
        assert.deepEqual(
          connection.simulateDownloadUntil(bytesToDownload, {timeAlreadyElapsed: 5234}),
          {
            bytesDownloaded: bytesToDownload,
            extraBytesDownloaded: 0,
            congestionWindow: 68,
            roundTrips: 51, // 5 mb / (1460 * 68)
            timeElapsed: 5100,
          }
        );
      });
    });

    describe('when maximumTime is set', () => {
      it('should provide the correct values less than TTFB', () => {
        const connection = new TcpConnection(100, Infinity, 0, false);
        assert.deepEqual(
          connection.simulateDownloadUntil(7300, {timeAlreadyElapsed: 0, maximumTimeToElapse: 68}),
          {
            bytesDownloaded: 7300,
            extraBytesDownloaded: 0,
            congestionWindow: 10,
            roundTrips: 2,
            timeElapsed: 200,
          }
        );
      });

      it('should provide the correct values just over TTFB', () => {
        const connection = new TcpConnection(100, Infinity, 0, false);
        assert.deepEqual(
          connection.simulateDownloadUntil(7300, {timeAlreadyElapsed: 0, maximumTimeToElapse: 250}),
          {
            bytesDownloaded: 7300,
            extraBytesDownloaded: 0,
            congestionWindow: 10,
            roundTrips: 2,
            timeElapsed: 200,
          }
        );
      });

      it('should provide the correct values with already elapsed', () => {
        const connection = new TcpConnection(100, Infinity, 0, false);
        assert.deepEqual(
          connection.simulateDownloadUntil(7300, {
            timeAlreadyElapsed: 75,
            maximumTimeToElapse: 250,
          }),
          {
            bytesDownloaded: 7300,
            extraBytesDownloaded: 0,
            congestionWindow: 10,
            roundTrips: 2,
            timeElapsed: 125,
          }
        );
      });

      it('should provide the correct values large payloads', () => {
        const connection = new TcpConnection(100, 8 * 1000 * 1000);
        const bytesToDownload = 10 * 1000 * 1000; // 10 mb
        assert.deepEqual(
          connection.simulateDownloadUntil(bytesToDownload, {
            timeAlreadyElapsed: 500,
            maximumTimeToElapse: 740,
          }),
          {
            bytesDownloaded: 683280, // should be less than 68 * 1460 * 8
            extraBytesDownloaded: 0,
            congestionWindow: 68,
            roundTrips: 8,
            timeElapsed: 800, // skips the handshake because time already elapsed
          }
        );
      });

      it('should all add up', () => {
        const connection = new TcpConnection(100, 8 * 1000 * 1000);
        const bytesToDownload = 10 * 1000 * 1000; // 10 mb
        const firstStoppingPoint = 5234;
        const secondStoppingPoint = 315;
        const thirdStoppingPoint = 10500 - firstStoppingPoint - secondStoppingPoint;

        const firstSegment = connection.simulateDownloadUntil(bytesToDownload, {
          timeAlreadyElapsed: 0,
          maximumTimeToElapse: firstStoppingPoint,
        });
        const firstOvershoot = firstSegment.timeElapsed - firstStoppingPoint;

        connection.setCongestionWindow(firstSegment.congestionWindow);
        const secondSegment = connection.simulateDownloadUntil(
          bytesToDownload - firstSegment.bytesDownloaded,
          {
            timeAlreadyElapsed: firstSegment.timeElapsed,
            maximumTimeToElapse: secondStoppingPoint - firstOvershoot,
          }
        );
        const secondOvershoot = firstOvershoot + secondSegment.timeElapsed - secondStoppingPoint;

        connection.setCongestionWindow(secondSegment.congestionWindow);
        const thirdSegment = connection.simulateDownloadUntil(
          bytesToDownload - firstSegment.bytesDownloaded - secondSegment.bytesDownloaded,
          {timeAlreadyElapsed: firstSegment.timeElapsed + secondSegment.timeElapsed}
        );
        const thirdOvershoot = secondOvershoot + thirdSegment.timeElapsed - thirdStoppingPoint;

        assert.equal(thirdOvershoot, 0);
        assert.equal(
          firstSegment.bytesDownloaded +
            secondSegment.bytesDownloaded +
            thirdSegment.bytesDownloaded,
          bytesToDownload
        );
        assert.equal(
          firstSegment.timeElapsed + secondSegment.timeElapsed + thirdSegment.timeElapsed,
          10500
        );
      });
    });
  });
});
