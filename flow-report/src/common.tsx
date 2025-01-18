/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent} from 'preact';
import {useEffect, useState} from 'preact/hooks';

import {NavigationIcon, SnapshotIcon, TimespanIcon} from './icons';
import {getFilmstripFrames, getScreenDimensions} from './util';
import {Util} from '../../shared/util.js';

const ANIMATION_FRAME_DURATION_MS = 500;

const Separator: FunctionComponent = () => {
  return <div className="Separator" role="separator"></div>;
};

const FlowStepIcon: FunctionComponent<{mode: LH.Result.GatherMode}> = ({mode}) => {
  return <>
    {
      mode === 'navigation' && <NavigationIcon/>
    }
    {
      mode === 'timespan' && <TimespanIcon/>
    }
    {
      mode === 'snapshot' && <SnapshotIcon/>
    }
  </>;
};

const FlowSegment: FunctionComponent<{mode?: LH.Result.GatherMode}> = ({mode}) => {
  return (
    <div className="FlowSegment">
      <div className="FlowSegment__top-line"/>
      {
        mode && <FlowStepIcon mode={mode}/>
      }
      <div className="FlowSegment__bottom-line"/>
    </div>
  );
};

const FlowStepAnimatedThumbnail: FunctionComponent<{
  frames: Array<{data: string}>,
  width: number,
  height: number,
}> = ({frames, width, height}) => {
  const [frameIndex, setFrameIndex] = useState(0);
  // Handle a frame array of a different length being set.
  const effectiveFrameIndex = frameIndex % frames.length;

  useEffect(() => {
    const interval = setInterval(
      () => setFrameIndex(i => (i + 1) % frames.length),
      ANIMATION_FRAME_DURATION_MS
    );

    return () => clearInterval(interval);
  }, [frames.length]);

  return (
    <img
      className="FlowStepThumbnail"
      data-testid="FlowStepAnimatedThumbnail"
      src={frames[effectiveFrameIndex].data}
      style={{width, height}}
      alt="Animated screenshots of a page tested by Lighthouse"
    />
  );
};

const FlowStepThumbnail: FunctionComponent<{
  lhr: LH.Result,
  width?: number,
  height?: number,
}> = ({lhr, width, height}) => {
  const frames = getFilmstripFrames(lhr);

  // Resize the image to fit the viewport aspect ratio.
  const dimensions = getScreenDimensions(lhr);
  if (width && height === undefined) {
    height = dimensions.height * width / dimensions.width;
  } else if (height && width === undefined) {
    width = dimensions.width * height / dimensions.height;
  }

  if (!width || !height) {
    console.warn(new Error('FlowStepThumbnail requested without any dimensions').stack);
    return <></>;
  }

  let thumbnail;
  if (frames?.length) {
    thumbnail = frames[frames.length - 1].data;
    if (lhr.gatherMode === 'timespan') {
      return <FlowStepAnimatedThumbnail frames={frames} width={width} height={height} />;
    }
  } else {
    thumbnail = Util.getFullPageScreenshot(lhr)?.screenshot.data;
  }

  return <>
    {
      thumbnail &&
        <img
          className="FlowStepThumbnail"
          src={thumbnail}
          style={{width, height}}
          alt="Screenshot of a page tested by Lighthouse"
        />
    }
  </>;
};

export {
  Separator,
  FlowStepIcon,
  FlowSegment,
  FlowStepThumbnail,
};
