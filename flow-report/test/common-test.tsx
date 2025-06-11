/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jestMock from 'jest-mock';
import {act, render} from '@testing-library/preact';

import {timers} from '../../core/test/test-env/fake-timers.js';
import {FlowStepThumbnail} from '../src/common';

let lhr: LH.Result;

describe('FlowStepThumbnail', () => {
  before(() => timers.useFakeTimers());
  after(() => timers.dispose());

  beforeEach(() => {
    global.console.warn = jestMock.fn();

    lhr = {
      gatherMode: 'navigation',
      configSettings: {screenEmulation: {width: 400, height: 600}},
      audits: {
        'screenshot-thumbnails': {
          details: {
            type: 'filmstrip',
            items: [
              {data: 'frame1'},
              {data: 'frame2'},
            ],
          },
        },
      },
      fullPageScreenshot: {
        screenshot: {data: 'FPS', width: 400, height: 600},
        nodes: {},
      },
    } as any;
  });

  it('renders a thumbnail', () => {
    const root = render(<FlowStepThumbnail lhr={lhr} width={200} height={200} />);

    const thumbnail = root.getByAltText(/Screenshot/);
    expect(thumbnail.style.width).toEqual('200px');
    expect(thumbnail.style.height).toEqual('200px');
  });

  it('renders nothing without dimensions', () => {
    const root = render(<FlowStepThumbnail lhr={lhr} />);

    expect(() => root.getByAltText(/Screenshot/)).toThrow();
    expect(global.console.warn).toHaveBeenCalled();
  });

  it('interpolates height', () => {
    const root = render(<FlowStepThumbnail lhr={lhr} width={200} />);

    const thumbnail = root.getByAltText(/Screenshot/);
    expect(thumbnail.style.width).toEqual('200px');
    expect(thumbnail.style.height).toEqual('300px');
  });

  it('interpolates width', () => {
    const root = render(<FlowStepThumbnail lhr={lhr} height={150} />);

    const thumbnail = root.getByAltText(/Screenshot/);
    expect(thumbnail.style.width).toEqual('100px');
    expect(thumbnail.style.height).toEqual('150px');
  });

  it('uses last filmstrip thumbnail', () => {
    const root = render(<FlowStepThumbnail lhr={lhr} height={150} />);

    const thumbnail = root.getByAltText(/Screenshot/) as HTMLImageElement;
    expect(thumbnail.src).toContain('frame2');
  });

  it('uses full page screenshot if filmstrip unavailable', () => {
    delete lhr.audits['screenshot-thumbnails'];
    const root = render(<FlowStepThumbnail lhr={lhr} height={150} />);

    const thumbnail = root.getByAltText(/Screenshot/) as HTMLImageElement;
    expect(thumbnail.src).toContain('FPS');
  });

  it('renders animated thumbnail for timespan', async () => {
    lhr.gatherMode = 'timespan';
    const root = render(<FlowStepThumbnail lhr={lhr} height={150} />);

    const thumbnail = root.getByAltText(/Animated/) as HTMLImageElement;
    expect(thumbnail.style.width).toEqual('100px');
    expect(thumbnail.style.height).toEqual('150px');

    expect(thumbnail.src).toContain('frame1');
    await act(() => {
      timers.advanceTimersByTime(501);
    });
    expect(thumbnail.src).toContain('frame2');
  });
});
