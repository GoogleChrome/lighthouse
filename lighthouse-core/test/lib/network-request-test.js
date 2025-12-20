/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRequest = require('../../lib/network-request.js');
const NetworkRecorder = require('../../lib/network-recorder.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

/* eslint-env jest */
describe('NetworkRequest', () => {
  afterEach(() => {
    global.isLightrider = undefined;
  });

  describe('update transfer size for Lightrider', () => {
    function getRequest() {
      return {
        transferSize: 100,
        responseHeaders: [{name: NetworkRequest.HEADER_FETCHED_SIZE, value: '10'}],
      };
    }

    it('does nothing if not Lightrider', () => {
      const req = getRequest();
      expect(req.transferSize).toStrictEqual(100);

      const devtoolsLog = networkRecordsToDevtoolsLog([req]);
      const record = NetworkRecorder.recordsFromLogs(devtoolsLog)[0];

      expect(record.transferSize).toStrictEqual(100);
    });

    it('updates transfer size if Lightrider', () => {
      const req = getRequest();
      expect(req.transferSize).toStrictEqual(100);

      const devtoolsLog = networkRecordsToDevtoolsLog([req]);
      global.isLightrider = true;
      const record = NetworkRecorder.recordsFromLogs(devtoolsLog)[0];

      expect(record.transferSize).toStrictEqual(10);
    });

    it('does nothing if header is non float', () => {
      const req = getRequest();
      req.responseHeaders = [
        {name: NetworkRequest.HEADER_FETCHED_SIZE, value: 'ten'},
      ];
      expect(req.transferSize).toStrictEqual(100);

      const devtoolsLog = networkRecordsToDevtoolsLog([req]);
      global.isLightrider = true;
      const record = NetworkRecorder.recordsFromLogs(devtoolsLog)[0];

      expect(record.transferSize).toStrictEqual(100);
    });

    it('does nothing if no header is set', () => {
      const req = getRequest();
      req.responseHeaders = [];
      expect(req.transferSize).toStrictEqual(100);

      const devtoolsLog = networkRecordsToDevtoolsLog([req]);
      global.isLightrider = true;
      const record = NetworkRecorder.recordsFromLogs(devtoolsLog)[0];

      expect(record.transferSize).toStrictEqual(100);
    });
  });

  describe('update fetch stats for Lightrider', () => {
    function getRequest() {
      return {
        // units = seconds
        startTime: 0,
        endTime: 2,
        responseReceivedTime: 1,

        // units = ms
        responseHeaders: [
          {name: NetworkRequest.HEADER_TOTAL, value: '10000'},
          {name: NetworkRequest.HEADER_TCP, value: '5000'},
          {name: NetworkRequest.HEADER_REQ, value: '2500'},
          {name: NetworkRequest.HEADER_SSL, value: '1000'},
          {name: NetworkRequest.HEADER_RES, value: '2500'},
        ],
      };
    }

    it('updates lrStatistics if in Lightrider', () => {
      const req = getRequest();

      const devtoolsLog = networkRecordsToDevtoolsLog([req]);
      global.isLightrider = true;
      const record = NetworkRecorder.recordsFromLogs(devtoolsLog)[0];

      expect(record.startTime).toStrictEqual(0);
      expect(record.endTime).toStrictEqual(2);
      expect(record.responseReceivedTime).toStrictEqual(1);
      expect(record.lrStatistics).toStrictEqual({
        endTimeDeltaMs: -8000,
        TCPMs: 5000,
        requestMs: 2500,
        responseMs: 2500,
      });
    });

    it('does nothing if not Lightrider', () => {
      const req = getRequest();
      req.responseHeaders = [];

      const devtoolsLog = networkRecordsToDevtoolsLog([req]);
      global.isLightrider = false;
      const record = NetworkRecorder.recordsFromLogs(devtoolsLog)[0];

      expect(record).toMatchObject(req);
      expect(record.lrStatistics).toStrictEqual(undefined);
    });

    it('does nothing if no HEADER_TOTAL', () => {
      const req = getRequest();
      req.responseHeaders = req.responseHeaders.filter(item => {
        return item.name !== NetworkRequest.HEADER_TOTAL;
      });

      const devtoolsLog = networkRecordsToDevtoolsLog([req]);
      global.isLightrider = true;
      const record = NetworkRecorder.recordsFromLogs(devtoolsLog)[0];

      expect(record).toMatchObject(req);
      expect(record.lrStatistics).toStrictEqual(undefined);
    });

    it('does nothing if header timings do not add up', () => {
      const req = getRequest();
      const tcpHeader = req.responseHeaders[1];
      expect(tcpHeader.name).toStrictEqual(NetworkRequest.HEADER_TCP);
      tcpHeader.value = '5001';

      const devtoolsLog = networkRecordsToDevtoolsLog([req]);
      global.isLightrider = true;
      const record = NetworkRecorder.recordsFromLogs(devtoolsLog)[0];

      expect(record).toMatchObject(req);
      expect(record.lrStatistics).toStrictEqual(undefined);
    });

    it('does nothing if SSL time exceeds TCP time', () => {
      const req = getRequest();
      const sslHeader = req.responseHeaders[3];
      expect(sslHeader.name).toStrictEqual(NetworkRequest.HEADER_SSL);
      sslHeader.value = '5500';

      const devtoolsLog = networkRecordsToDevtoolsLog([req]);

      global.isLightrider = true;
      const record = NetworkRecorder.recordsFromLogs(devtoolsLog)[0];

      expect(record).toMatchObject(req);
      expect(record.lrStatistics).toStrictEqual(undefined);
    });

    it('does not update lrStatistics when a timing header parses as NaN', () => {
      const req = getRequest();
      const tcpHeader = req.responseHeaders[1];
      expect(tcpHeader.name).toStrictEqual(NetworkRequest.HEADER_TCP);
      tcpHeader.value = 'Not a number';

      const devtoolsLog = networkRecordsToDevtoolsLog([req]);
      global.isLightrider = true;
      const record = NetworkRecorder.recordsFromLogs(devtoolsLog)[0];

      expect(record).toMatchObject(req);
      expect(record.lrStatistics).toStrictEqual(undefined);
    });

    it('treats negative timings as 0', function() {
      const req = getRequest();
      req.responseHeaders = [{name: NetworkRequest.HEADER_TOTAL, value: '10000'},
        {name: NetworkRequest.HEADER_TCP, value: '-1'},
        {name: NetworkRequest.HEADER_REQ, value: '-1'},
        {name: NetworkRequest.HEADER_SSL, value: '-1'},
        {name: NetworkRequest.HEADER_RES, value: '10000'}];

      const devtoolsLog = networkRecordsToDevtoolsLog([req]);
      global.isLightrider = true;
      const record = NetworkRecorder.recordsFromLogs(devtoolsLog)[0];

      expect(record.lrStatistics).toStrictEqual({
        endTimeDeltaMs: -8000,
        TCPMs: 0,
        requestMs: 0,
        responseMs: 10000,
      });
    });

    it('treats missing timings as 0', function() {
      const req = getRequest();
      req.responseHeaders = [{name: NetworkRequest.HEADER_TOTAL, value: '10000'},
        {name: NetworkRequest.HEADER_TCP, value: '1000'},
        {name: NetworkRequest.HEADER_RES, value: '9000'}];

      const devtoolsLog = networkRecordsToDevtoolsLog([req]);
      global.isLightrider = true;
      const record = NetworkRecorder.recordsFromLogs(devtoolsLog)[0];

      expect(record.lrStatistics).toStrictEqual({
        endTimeDeltaMs: -8000,
        TCPMs: 1000,
        requestMs: 0,
        responseMs: 9000,
      });
    });

    it('does not override existing timing properties', function() {
      const req = getRequest();
      req.timing = {proxyStart: 17, sslStart: 35};
      const devtoolsLog = networkRecordsToDevtoolsLog([req]);

      const noLRRecord = NetworkRecorder.recordsFromLogs(devtoolsLog)[0];
      expect(noLRRecord.timing.proxyStart).toStrictEqual(17);
      expect(noLRRecord.timing.sslStart).toStrictEqual(35);

      global.isLightrider = true;
      const lrRecord = NetworkRecorder.recordsFromLogs(devtoolsLog)[0];

      expect(lrRecord.timing).toMatchObject({
        proxyStart: 17,
        sslStart: 35,
      });
      expect(lrRecord.lrStatistics).toStrictEqual({
        endTimeDeltaMs: -8000,
        TCPMs: 5000,
        requestMs: 2500,
        responseMs: 2500,
      });
    });
  });
});
