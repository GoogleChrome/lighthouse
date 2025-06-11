/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent} from 'preact';

import {FlowStepIcon, FlowStepThumbnail} from './common';
import {useLocalizedStrings} from './i18n/i18n';
import {getModeDescription, useFlowResult} from './util';

const SIDE_THUMBNAIL_HEIGHT = 80;
const MAIN_THUMBNAIL_HEIGHT = 120;

const HeaderThumbnail: FunctionComponent<{
  lhr: LH.Result,
  position: 'prev'|'next'|'main'
}> =
({lhr, position}) => {
  const height = position === 'main' ? MAIN_THUMBNAIL_HEIGHT : SIDE_THUMBNAIL_HEIGHT;
  return (
    <div className={`HeaderThumbnail HeaderThumbnail--${position}`}>
      <FlowStepThumbnail lhr={lhr} height={height}/>
      <div className="HeaderThumbnail__icon">
        <FlowStepIcon mode={lhr.gatherMode}/>
      </div>
    </div>
  );
};

export const Header: FunctionComponent<{hashState: LH.HashState}> =
({hashState}) => {
  const flowResult = useFlowResult();
  const {index} = hashState;

  const step = flowResult.steps[index];
  const prevStep = flowResult.steps[index - 1];
  const nextStep = flowResult.steps[index + 1];

  const strings = useLocalizedStrings();
  const modeDescription = getModeDescription(step.lhr.gatherMode, strings);

  return (
    <div className="Header">
      {
        prevStep && <>
          {
            flowResult.steps[index - 2] && <div className="Header__segment"/>
          }
          <div className="Header__prev-thumbnail">
            <HeaderThumbnail lhr={prevStep.lhr} position="prev"/>
            <div className="Header__segment"/>
          </div>
          <a
            className="Header__prev-title"
            href={`#index=${index - 1}`}
          >{prevStep.name}</a>
        </>
      }
      <div className="Header__current-thumbnail">
        <HeaderThumbnail lhr={step.lhr} position="main"/>
      </div>
      <div className="Header__current-title">
        {step.name}
        <div className="Header__current-description">
          {modeDescription}
        </div>
      </div>
      {
        nextStep && <>
          <div className="Header__next-thumbnail">
            <div className="Header__segment"/>
            <HeaderThumbnail lhr={nextStep.lhr} position="next"/>
          </div>
          <a
            className="Header__next-title"
            href={`#index=${index + 1}`}
          >{nextStep.name}</a>
          {
            flowResult.steps[index + 2] && <div className="Header__segment"/>
          }
        </>
      }
    </div>
  );
};
