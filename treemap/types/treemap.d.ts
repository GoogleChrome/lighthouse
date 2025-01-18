import {Logger as _Logger} from '../../report/renderer/logger.js';
import Treemap_ from '../../types/lhr/treemap';
import * as Settings from '../../types/lhr/settings';
import 'google.analytics';
import LHResult from '../../types/lhr/lhr';
import {TreemapUtil} from '../app/src/util';
import FlowResult_ from '../../types/lhr/flow-result';

// Import for needed DOM type augmentation.
import '../../report/types/augment-dom';

declare global {
  // Expose global types in LH namespace.
  module LH {
    export import Treemap = Treemap_;
    export import Result = LHResult;
    export import Locale = Settings.Locale;
    export import FlowResult = FlowResult_;
  }

  class WebTreeMap {
    constructor(data: any, options: WebTreeMapOptions);
    render(el: HTMLElement): void;
    layout(data: any, el: HTMLElement): void;
    zoom(address: number[]): void
  }

  interface WebTreeMapOptions {
    padding: [number, number, number, number];
    spacing: number;
    caption(node: LH.Treemap.Node): string;
    showNode?(node: LH.Treemap.Node): boolean;
  }

  interface RenderState {
    root: LH.Treemap.Node;
    viewMode: LH.Treemap.ViewMode;
  }

  var webtreemap: {
    TreeMap: typeof WebTreeMap;
    render(el: HTMLElement, data: any, options: WebTreeMapOptions): void;
    sort(data: any): void;
  };
  var logger: _Logger;
  var idbKeyval: typeof import('idb-keyval');
  // `strings` is generated in build/build-treemap.js
  var strings: Record<Settings.Locale, typeof TreemapUtil['UIStrings']>;

  interface Window {
    logger: _Logger;
    __treemapOptions?: LH.Treemap.Options;
    __hash?: string;
    ga: UniversalAnalytics.ga;
  }

  interface AddEventListenerOptions {
    signal?: AbortSignal;
  }
}
