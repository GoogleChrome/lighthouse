/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent} from 'preact';

import {convertMarkdownCodeSnippets} from '../../../report/renderer/api';
import {useExternalRenderer} from '../util';

export const Markdown: FunctionComponent<{text: string}> = ({text}) => {
  const ref = useExternalRenderer<HTMLSpanElement>(() => {
    return convertMarkdownCodeSnippets(text);
  }, [text]);

  return <span ref={ref}/>;
};
