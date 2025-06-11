/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent} from 'preact';

import {createStylesElement} from '../../../report/renderer/api';
import {useExternalRenderer} from '../util';

export const Styles: FunctionComponent = () => {
  const ref = useExternalRenderer<HTMLDivElement>(createStylesElement);

  return <div ref={ref}/>;
};
