/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent, JSX} from 'preact';

import {useLocalizedStrings} from './i18n/i18n';
import {CloseIcon, NavigationIcon, SnapshotIcon, TimespanIcon} from './icons';

const HelpDialogColumn: FunctionComponent<{
  icon: JSX.Element,
  userFriendlyModeLabel: string;
  lighthouseOfficialModeLabel: string;
  modeDescription: string;
  useCaseInstruction: string;
  useCases: string[];
  availableCategories: string[];
}> = (props) => {
  const strings = useLocalizedStrings();

  return (
    <div className="HelpDialogColumn">
      <div className="HelpDialogColumn__legend">
        <div className="HelpDialogColumnTimeline">
          {props.icon}
          <div className="HelpDialogColumnTimeline__line" />
        </div>
        <div className="HelpDialogColumn__legend-label">{props.userFriendlyModeLabel}</div>
      </div>
      <div className="HelpDialogColumn__header">
        <div className="HelpDialogColumn__header-title">{props.lighthouseOfficialModeLabel}</div>
        <p>{props.modeDescription}</p>
      </div>
      <div className="HelpDialogColumn__use-cases">
        <p>{props.useCaseInstruction}</p>
        <ul>
          {props.useCases.map((useCase, i) => (
            <li key={i}>{useCase}</li>
          ))}
        </ul>
      </div>
      <div className="HelpDialogColumn__categories">
        <p>{strings.categories}</p>
        <ul>
          {props.availableCategories.map((category, i) => (
            <li key={i}>{category}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const HelpDialog: FunctionComponent<{onClose: () => void}> = ({
  onClose,
}) => {
  const strings = useLocalizedStrings();

  return (
    <div className="HelpDialog">
      <div className="HelpDialog__title">
        <div>{strings.helpDialogTitle}</div>
        <div style={{flexGrow: 1}} />
        <button className="HelpDialog__close" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="HelpDialog__columns">
        <HelpDialogColumn
          icon={<NavigationIcon />}
          userFriendlyModeLabel={strings.navigationDescription}
          lighthouseOfficialModeLabel={strings.navigationReport}
          modeDescription={strings.navigationLongDescription}
          useCaseInstruction={strings.helpUseCaseInstructionNavigation}
          useCases={[
            strings.helpUseCaseNavigation1,
            strings.helpUseCaseNavigation2,
            strings.helpUseCaseNavigation3,
          ]}
          availableCategories={[
            strings.categoryPerformance,
            strings.categoryAccessibility,
            strings.categoryBestPractices,
            strings.categorySeo,
          ]}
        />
        <HelpDialogColumn
          icon={<TimespanIcon />}
          userFriendlyModeLabel={strings.timespanDescription}
          lighthouseOfficialModeLabel={strings.timespanReport}
          modeDescription={strings.timespanLongDescription}
          useCaseInstruction={strings.helpUseCaseInstructionTimespan}
          useCases={[strings.helpUseCaseTimespan1, strings.helpUseCaseTimespan2]}
          availableCategories={[
            strings.categoryPerformance,
            strings.categoryBestPractices,
          ]}
        />
        <HelpDialogColumn
          icon={<SnapshotIcon />}
          userFriendlyModeLabel={strings.snapshotDescription}
          lighthouseOfficialModeLabel={strings.snapshotReport}
          modeDescription={strings.snapshotLongDescription}
          useCaseInstruction={strings.helpUseCaseInstructionSnapshot}
          useCases={[strings.helpUseCaseSnapshot1, strings.helpUseCaseSnapshot2]}
          availableCategories={[
            strings.categoryPerformance,
            strings.categoryAccessibility,
            strings.categoryBestPractices,
            strings.categorySeo,
          ]}
        />
      </div>
    </div>
  );
};
