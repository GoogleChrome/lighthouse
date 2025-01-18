/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent, JSX} from 'preact';
import {useState} from 'preact/hooks';

import {HelpDialog} from './help-dialog';
import {getFlowResultFilenamePrefix} from '../../report/generator/file-namer';
import {useLocalizedStrings} from './i18n/i18n';
import {HamburgerIcon, InfoIcon} from './icons';
import {useFlowResult, useOptions} from './util';
import {saveFile} from '../../report/renderer/api';

function saveHtml(flowResult: LH.FlowResult, htmlStr: string) {
  const blob = new Blob([htmlStr], {type: 'text/html'});
  const filename = getFlowResultFilenamePrefix(flowResult) + '.html';
  saveHtml.saveFile(blob, filename);
}

// Store `saveFile` here so we can do dependency injection.
saveHtml.saveFile = saveFile;

/* eslint-disable max-len */
const Logo: FunctionComponent = () => {
  return (
    <svg role="img" class="lh-topbar__logo" title="Lighthouse logo" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="m14 7 10-7 10 7v10h5v7h-5l5 24H9l5-24H9v-7h5V7Z" fill="#F63"/>
      <path d="M31.561 24H14l-1.689 8.105L31.561 24ZM18.983 48H9l1.022-4.907L35.723 32.27l1.663 7.98L18.983 48Z" fill="#FFA385"/>
      <path fill="#FF3" d="M20.5 10h7v7h-7z"/>
    </svg>
  );
};
/* eslint-enable max-len */

const TopbarButton: FunctionComponent<{
  onClick: JSX.MouseEventHandler<HTMLButtonElement>,
  label: string,
}> =
({onClick, label, children}) => {
  return (
    <button className="TopbarButton" onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
};

const Topbar: FunctionComponent<{onMenuClick: JSX.MouseEventHandler<HTMLButtonElement>}> =
({onMenuClick}) => {
  const flowResult = useFlowResult();
  const strings = useLocalizedStrings();
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const {getReportHtml, saveAsGist} = useOptions();

  return (
    <div className="Topbar">
      <TopbarButton onClick={onMenuClick} label="Button that opens and closes the sidebar">
        <HamburgerIcon/>
      </TopbarButton>
      <div className="Topbar__logo">
        <Logo/>
      </div>
      <div className="Topbar__title">{strings.title}</div>
      {
        getReportHtml &&
          <TopbarButton
            onClick={() => {
              const htmlStr = getReportHtml(flowResult);
              saveHtml(flowResult, htmlStr);
            }}
            label="Button that saves the report as HTML"
          >{strings.save}</TopbarButton>
      }
      {
        saveAsGist &&
          <TopbarButton
            onClick={() => saveAsGist(flowResult)}
            label="Button that saves the report to a gist"
          >{strings.dropdownSaveGist}</TopbarButton>
      }
      <div style={{flexGrow: 1}} />
      <TopbarButton
        onClick={() => setShowHelpDialog(previous => !previous)}
        label="Button that toggles the help dialog"
      >
        <div className="Topbar__help-label">
          <InfoIcon/>
          {strings.helpLabel}
        </div>
      </TopbarButton>
      {showHelpDialog ?
        <HelpDialog onClose={() => setShowHelpDialog(false)} /> :
        null
      }
    </div>
  );
};

export {
  Topbar,
  saveHtml,
};
