/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from './lantern.js';

const {calculateSumOfBlockingTime} = Lantern.TBTUtils;

describe('TotalBlockingTime utils', () => {
  it('reports 0 when no task is longer than 50ms', () => {
    const events = [
      {start: 1000, end: 1050, duration: 50},
      {start: 2000, end: 2010, duration: 10},
    ];

    const fcpTimeMs = 500;
    const interactiveTimeMs = 4000;

    expect(
      calculateSumOfBlockingTime(events, fcpTimeMs, interactiveTimeMs)
    ).toBe(0);
  });

  it('only looks at tasks within FCP and TTI', () => {
    const events = [
      {start: 1000, end: 1060, duration: 60},
      {start: 2000, end: 2100, duration: 100},
      {start: 2300, end: 2450, duration: 150},
      {start: 2600, end: 2800, duration: 200},
    ];

    const fcpTimeMs = 1500;
    const interactiveTimeMs = 2500;

    expect(
      calculateSumOfBlockingTime(events, fcpTimeMs, interactiveTimeMs)
    ).toBe(150);
  });

  it('clips before finding blocking regions', () => {
    const fcpTimeMs = 150;
    const interactiveTimeMs = 300;

    const events = [
      // The clipping is done first, so the task becomes [150, 200] after clipping and contributes
      // 0ms of blocking time. This is in contrast to first calculating the blocking region ([100,
      // 200]) and then clipping at FCP (150ms), which yields 50ms blocking time.
      {start: 50, end: 200, duration: 150},
      // Similarly, the task is first clipped above to be [240, 300], and then contributes 10ms
      // blocking time.
      {start: 240, end: 460, duration: 120},
    ];

    expect(
      calculateSumOfBlockingTime(events, fcpTimeMs, interactiveTimeMs)
    ).toBe(10); // 0ms + 10ms.
  });

  // TTI can happen in the middle of a task, for example, if TTI is at FMP which occurs as part
  // of a larger task, or in the lantern case where we use estimate TTI using a different graph
  // from the one used to estimate TBT.
  it('clips properly if TTI falls in the middle of a task', () => {
    const fcpTimeMs = 1000;
    const interactiveTimeMs = 2000;

    expect(
      calculateSumOfBlockingTime(
        [{start: 1951, end: 2100, duration: 149}],
        fcpTimeMs,
        interactiveTimeMs
      )
    ).toBe(0); // Duration after clipping is 49, which is < 50.
    expect(
      calculateSumOfBlockingTime(
        [{start: 1950, end: 2100, duration: 150}],
        fcpTimeMs,
        interactiveTimeMs
      )
    ).toBe(0); // Duration after clipping is 50, so time after 50ms is 0ms.
    expect(
      calculateSumOfBlockingTime(
        [{start: 1949, end: 2100, duration: 151}],
        fcpTimeMs,
        interactiveTimeMs
      )
    ).toBe(1); // Duration after clipping is 51, so time after 50ms is 1ms.
  });

  it('clips properly if FCP falls in the middle of a task', () => {
    const fcpTimeMs = 1000;
    const interactiveTimeMs = 2000;

    expect(
      calculateSumOfBlockingTime(
        [{start: 900, end: 1049, duration: 149}],
        fcpTimeMs,
        interactiveTimeMs
      )
    ).toBe(0); // Duration after clipping is 49, which is < 50.
    expect(
      calculateSumOfBlockingTime(
        [{start: 900, end: 1050, duration: 150}],
        fcpTimeMs,
        interactiveTimeMs
      )
    ).toBe(0); // Duration after clipping is 50, so time after 50ms is 0ms.
    expect(
      calculateSumOfBlockingTime(
        [{start: 900, end: 1051, duration: 151}],
        fcpTimeMs,
        interactiveTimeMs
      )
    ).toBe(1); // Duration after clipping is 51, so time after 50ms is 1ms.
  });

  // This can happen in the lantern metric case, where we use the optimistic
  // TTI and pessimistic FCP.
  it('returns 0 if interactiveTime is earlier than FCP', () => {
    const fcpTimeMs = 2050;
    const interactiveTimeMs = 1050;

    const events = [{start: 500, end: 3000, duration: 2500}];

    expect(
      calculateSumOfBlockingTime(events, fcpTimeMs, interactiveTimeMs)
    ).toBe(0);
  });
});
