/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {'parseHTML'|'styleLayout'|'paintCompositeRender'|'scriptParseCompile'|'scriptEvaluation'|'garbageCollection'|'other'} TaskGroupIds */

/**
 * @typedef TaskGroup
 * @property {TaskGroupIds} id
 * @property {string} label
 * @property {string[]} traceEventNames
 */

/**
 * Make sure the traceEventNames keep up with the ones in DevTools
 * @see https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/timeline_model/TimelineModel.js?type=cs&q=TimelineModel.TimelineModel.RecordType+%3D&g=0&l=1156
 * @see https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/timeline/TimelineUIUtils.js?type=cs&q=_initEventStyles+-f:out+f:devtools&sq=package:chromium&g=0&l=39
 * @type {{[P in TaskGroupIds]: {id: P, label: string, traceEventNames: Array<string>}}}
 */
const taskGroups = {
  parseHTML: {
    id: 'parseHTML',
    label: 'Parse HTML & CSS',
    traceEventNames: ['ParseHTML', 'ParseAuthorStyleSheet'],
  },
  styleLayout: {
    id: 'styleLayout',
    label: 'Style & Layout',
    traceEventNames: [
      'ScheduleStyleRecalculation',
      'UpdateLayoutTree', // previously RecalculateStyles
      'InvalidateLayout',
      'Layout',
    ],
  },
  paintCompositeRender: {
    id: 'paintCompositeRender',
    label: 'Rendering',
    traceEventNames: [
      'Animation',
      'HitTest',
      'PaintSetup',
      'Paint',
      'PaintImage',
      'RasterTask', // Previously Rasterize
      'ScrollLayer',
      'UpdateLayer',
      'UpdateLayerTree',
      'CompositeLayers',
      'PrePaint', // New name for UpdateLayerTree: https://crrev.com/c/3519012
    ],
  },
  scriptParseCompile: {
    id: 'scriptParseCompile',
    label: 'Script Parsing & Compilation',
    traceEventNames: ['v8.compile', 'v8.compileModule', 'v8.parseOnBackground'],
  },
  scriptEvaluation: {
    id: 'scriptEvaluation',
    label: 'Script Evaluation',
    traceEventNames: [
      'EventDispatch',
      'EvaluateScript',
      'v8.evaluateModule',
      'FunctionCall',
      'TimerFire',
      'FireIdleCallback',
      'FireAnimationFrame',
      'RunMicrotasks',
      'V8.Execute',
    ],
  },
  garbageCollection: {
    id: 'garbageCollection',
    label: 'Garbage Collection',
    traceEventNames: [
      'MinorGC', // Previously GCEvent
      'MajorGC',
      'BlinkGC.AtomicPhase', // Previously ThreadState::performIdleLazySweep, ThreadState::completeSweep, BlinkGCMarking

      // Kept for compatibility on older traces
      'ThreadState::performIdleLazySweep',
      'ThreadState::completeSweep',
      'BlinkGCMarking',
    ],
  },
  other: {
    id: 'other',
    label: 'Other',
    traceEventNames: [
      'MessageLoop::RunTask',
      'TaskQueueManager::ProcessTaskFromWorkQueue',
      'ThreadControllerImpl::DoWork',
    ],
  },
};

/** @type {Object<string, TaskGroup>} */
const taskNameToGroup = {};
for (const group of Object.values(taskGroups)) {
  for (const traceEventName of group.traceEventNames) {
    taskNameToGroup[traceEventName] = group;
  }
}

export {
  taskGroups,
  taskNameToGroup,
};
