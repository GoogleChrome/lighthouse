/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ArbitraryEqualityMap as ArbitraryEqualityMap_} from '../core/lib/arbitrary-equality-map.js';
import * as Artifacts_ from './artifacts.js';
import Audit_ from './audit.js';
import Config_ from './config.js';
import {Protocol as _Crdp} from 'devtools-protocol/types/protocol.js';
import {ProtocolMapping as _CrdpMappings} from 'devtools-protocol/types/protocol-mapping.js';
import * as Externs from './externs.js';
import Gatherer_ from './gatherer.js';
import * as I18n from './lhr/i18n.js';
import {LighthouseError as LighthouseError_} from '../core/lib/lh-error.js';
import LHResult from './lhr/lhr.js';
import FlowResult_ from './lhr/flow-result.js';
import Protocol_ from './protocol.js';
import * as Settings from './lhr/settings.js';
import Treemap_ from './lhr/treemap.js';
import UserFlow_ from './user-flow.js';
import Puppeteer_ from './puppeteer.js';
import Util_ from './utility-types.js';

// Construct hierarchy of global types under the LH namespace.
export type ArbitraryEqualityMap = ArbitraryEqualityMap_;
export type NavigationRequestor = string | (() => Promise<void> | void);

export import Util = Util_;

export import Puppeteer = Puppeteer_;

// artifacts.d.ts
export import Artifacts = Artifacts_.Artifacts;
export import BaseArtifacts = Artifacts_.BaseArtifacts;
export import GathererArtifacts = Artifacts_.GathererArtifacts;
export import DevtoolsLog = Artifacts_.DevtoolsLog;
export import Trace = Artifacts_.Trace;
export import TraceCpuProfile = Artifacts_.TraceCpuProfile;
export import TraceEvent = Artifacts_.TraceEvent;

export import Audit = Audit_;
export import Config = Config_;
export import Crdp = _Crdp;
export import CrdpEvents = _CrdpMappings.Events;
export import CrdpCommands = _CrdpMappings.Commands;

export import UserFlow = UserFlow_;

// externs.d.ts
export import Flags = Externs.Flags;
export import CliFlags = Externs.CliFlags;
export import RunnerResult = Externs.RunnerResult;
export import DevToolsJsonTarget = Externs.DevToolsJsonTarget;

export import Gatherer = Gatherer_;
export import LighthouseError = LighthouseError_;
export import Result = LHResult;
export import FlowResult = FlowResult_;

// lhr/i18n.d.ts
export import IcuMessage = I18n.IcuMessage;
export import RawIcu = I18n.RawIcu;
export import FormattedIcu = I18n.FormattedIcu;

export import Protocol = Protocol_;

// lhr/settings.d.ts
export import Locale = Settings.Locale;
export import ThrottlingSettings = Settings.ThrottlingSettings;
export import ScreenEmulationSettings = Settings.ScreenEmulationSettings;
export import SharedFlagsSettings = Settings.SharedFlagsSettings;
export import OutputMode = Settings.OutputMode;
export import PrecomputedLanternData = Settings.PrecomputedLanternData;

export import Treemap = Treemap_;
