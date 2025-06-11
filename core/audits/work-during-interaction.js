/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import {Responsiveness} from '../computed/metrics/responsiveness.js';
import {ProcessedTrace} from '../computed/processed-trace.js';
import * as i18n from '../lib/i18n/i18n.js';
import {NetworkRecords} from '../computed/network-records.js';
import {MainThreadTasks} from '../lib/tracehouse/main-thread-tasks.js';
import {taskGroups} from '../lib/tracehouse/task-groups.js';
import {TraceProcessor} from '../lib/tracehouse/trace-processor.js';
import {getExecutionTimingsByURL} from '../lib/tracehouse/task-summary.js';
import InteractionToNextPaint from './metrics/interaction-to-next-paint.js';

/** @typedef {import('../computed/metrics/responsiveness.js').EventTimingEvent} EventTimingEvent */
/** @typedef {import('../lib/tracehouse/main-thread-tasks.js').TaskNode} TaskNode */

const TASK_THRESHOLD = 1;

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on the main thread work the browser did during a key user interaction. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'Minimizes work during key interaction',
  /** Title of a diagnostic audit that provides detail on the main thread work the browser did during a key user interaction. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
  failureTitle: 'Minimize work during key interaction',
  /** Description of the work-during-interaction metric. This description is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'This is the thread-blocking work occurring during the Interaction to Next Paint measurement. [Learn more about the Interaction to Next Paint metric](https://web.dev/articles/inp).',
  /** Label for a column in a data table; entries will be information on the time that the browser is delayed before responding to user input. Ideally fits within a ~40 character limit. */
  inputDelay: 'Input delay',
  /** Label for a column in a data table; entries will be information on the time taken by code processing user input that delays a response to the user. Ideally fits within a ~40 character limit. */
  processingDuration: 'Processing duration',
  /** Label for a column in a data table; entries will be information on the time that the browser is delayed before presenting a response to user input on screen. Ideally fits within a ~40 character limit. */
  presentationDelay: 'Presentation delay',
  /**
   * @description Summary text that identifies the time the browser took to process a user interaction.
   * @example {mousedown} interactionType
   */
  displayValue: `{timeInMs, number, milliseconds}\xa0ms spent on event '{interactionType}'`,
  /** Label for a column in a data table; entries will the UI element that was the target of a user interaction (for example, a button that was clicked on). Ideally fits within a ~40 character limit. */
  eventTarget: 'Event target',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * @fileoverview This metric gives a high-percentile measure of responsiveness to input.
 */
class WorkDuringInteraction extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'work-during-interaction',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
      supportedModes: ['timespan'],
      guidanceLevel: 1,
      requiredArtifacts: ['Trace', 'DevtoolsLog', 'TraceElements'],
    };
  }

  /**
   * @param {TaskNode} task
   * @param {TaskNode|undefined} parent
   * @param {number} startTs
   * @param {number} endTs
   * @return {number}
   */
  static recursivelyClipTasks(task, parent, startTs, endTs) {
    const taskEventStart = task.event.ts;
    const taskEventEnd = task.endEvent?.ts ?? task.event.ts + Number(task.event.dur || 0);

    task.startTime = Math.max(startTs, Math.min(endTs, taskEventStart)) / 1000;
    task.endTime = Math.max(startTs, Math.min(endTs, taskEventEnd)) / 1000;
    task.duration = task.endTime - task.startTime;

    const childTime = task.children
      .map(child => WorkDuringInteraction.recursivelyClipTasks(child, task, startTs, endTs))
      .reduce((sum, child) => sum + child, 0);
    task.selfTime = task.duration - childTime;
    return task.duration;
  }

  /**
   * Clip the tasks by the start and end points. Take the easy route and drop
   * to duration 0 if out of bounds, since only durations are needed in the
   * end (for now).
   * Assumes owned tasks, so modifies in place. Can be called multiple times on
   * the same `tasks` because always computed from original event timing.
   * @param {Array<TaskNode>} tasks
   * @param {number} startTs
   * @param {number} endTs
   */
  static clipTasksByTs(tasks, startTs, endTs) {
    for (const task of tasks) {
      if (task.parent) continue;
      WorkDuringInteraction.recursivelyClipTasks(task, undefined, startTs, endTs);
    }
  }

  /**
   * @param {EventTimingEvent} interactionEvent
   */
  static getPhaseTimes(interactionEvent) {
    const interactionData = interactionEvent.args.data;
    const startTs = interactionEvent.ts;
    const navStart = startTs - interactionData.timeStamp * 1000;
    const processingStartTs = navStart + interactionData.processingStart * 1000;
    const processingEndTs = navStart + interactionData.processingEnd * 1000;
    const endTs = startTs + interactionData.duration * 1000;
    return {
      inputDelay: {startTs, endTs: processingStartTs},
      processingDuration: {startTs: processingStartTs, endTs: processingEndTs},
      presentationDelay: {startTs: processingEndTs, endTs},
    };
  }

  /**
   * @param {EventTimingEvent} interactionEvent
   * @param {LH.Trace} trace
   * @param {LH.Artifacts.ProcessedTrace} processedTrace
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {{table: LH.Audit.Details.Table, phases: Record<string, {startTs: number, endTs: number}>}}
   */
  static getThreadBreakdownTable(interactionEvent, trace, processedTrace, networkRecords) {
    // Limit to interactionEvent's thread.
    // TODO(bckenny): limit to interactionEvent's navigation.
    const threadEvents = TraceProcessor.filteredTraceSort(trace.traceEvents, evt => {
      return evt.pid === interactionEvent.pid && evt.tid === interactionEvent.tid;
    });
    const traceEndTs = threadEvents.reduce((endTs, evt) => {
      return Math.max(evt.ts + (evt.dur || 0), endTs);
    }, 0);
    // frames is only used for URL attribution, so can include all frames, even if OOPIF.
    const {frames} = processedTrace;
    const threadTasks = MainThreadTasks.getMainThreadTasks(threadEvents, frames, traceEndTs);

    const phases = WorkDuringInteraction.getPhaseTimes(interactionEvent);

    /** @type {LH.Audit.Details.TableItem[]} */
    const items = [];
    for (const [phaseName, phaseTimes] of Object.entries(phases)) {
      // Clip tasks to start and end time.
      WorkDuringInteraction.clipTasksByTs(threadTasks, phaseTimes.startTs, phaseTimes.endTs);
      const executionTimings = getExecutionTimingsByURL(threadTasks, networkRecords);

      const results = [];
      for (const [url, timingByGroupId] of executionTimings) {
        const totalExecutionTimeForURL = Object.values(timingByGroupId)
            .reduce((total, timespanMs) => total + timespanMs);

        const scriptingTotal = timingByGroupId[taskGroups.scriptEvaluation.id] || 0;
        const layoutTotal = timingByGroupId[taskGroups.styleLayout.id] || 0;
        const renderTotal = timingByGroupId[taskGroups.paintCompositeRender.id] || 0;

        results.push({
          url: url,
          total: totalExecutionTimeForURL,
          scripting: scriptingTotal,
          layout: layoutTotal,
          render: renderTotal,
        });
      }

      const filteredResults = results
        .filter(result => result.total > TASK_THRESHOLD)
        .sort((a, b) => b.total - a.total);

      items.push({
        phase: str_(UIStrings[/** @type {keyof UIStrings} */ (phaseName)]),
        total: (phaseTimes.endTs - phaseTimes.startTs) / 1000,
        subItems: {
          type: 'subitems',
          items: filteredResults,
        },
      });
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'phase', valueType: 'text', subItemsHeading: {key: 'url', valueType: 'url'}, label: 'Phase'},
      {key: 'total', valueType: 'ms', subItemsHeading: {key: 'total', granularity: 1, valueType: 'ms'}, granularity: 1, label: 'Total time'},
      {key: null, valueType: 'ms', subItemsHeading: {key: 'scripting', granularity: 1, valueType: 'ms'}, label: 'Script evaluation'},
      {key: null, valueType: 'ms', subItemsHeading: {key: 'layout', granularity: 1, valueType: 'ms'}, label: taskGroups.styleLayout.label},
      {key: null, valueType: 'ms', subItemsHeading: {key: 'render', granularity: 1, valueType: 'ms'}, label: taskGroups.paintCompositeRender.label},
      /* eslint-enable max-len */
    ];

    return {
      table: Audit.makeTableDetails(headings, items, {sortedBy: ['total']}),
      phases,
    };
  }

  /**
   * @param {LH.Artifacts['TraceElements']} traceElements
   * @return {LH.Audit.Details.Table | undefined}
   */
  static getTraceElementTable(traceElements) {
    const responsivenessElement = traceElements.find(el => el.traceEventType === 'responsiveness');
    if (!responsivenessElement) return;

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', valueType: 'node', label: str_(UIStrings.eventTarget)},
    ];
    const elementItems = [{node: Audit.makeNodeItem(responsivenessElement.node)}];

    return Audit.makeTableDetails(headings, elementItems);
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const {settings} = context;
    // TODO: responsiveness isn't yet supported by lantern.
    if (settings.throttlingMethod === 'simulate') {
      return {
        score: null,
        notApplicable: true,
        metricSavings: {INP: 0},
      };
    }

    const trace = artifacts.Trace;
    const metricData = {trace, settings};
    const interactionEvent = await Responsiveness.request(metricData, context);
    // If no interaction, diagnostic audit is n/a.
    if (interactionEvent === null) {
      return {
        score: null,
        notApplicable: true,
        metricSavings: {INP: 0},
      };
    }

    const auditDetailsItems = [];

    const traceElementItem = WorkDuringInteraction.getTraceElementTable(artifacts.TraceElements);
    if (traceElementItem) auditDetailsItems.push(traceElementItem);

    const devtoolsLog = artifacts.DevtoolsLog;
    // Network records will usually be empty for timespans.
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const processedTrace = await ProcessedTrace.request(trace, context);
    const {table: breakdownTable, phases} = WorkDuringInteraction.getThreadBreakdownTable(
        interactionEvent, trace, processedTrace, networkRecords);
    auditDetailsItems.push(breakdownTable);

    const interactionType = interactionEvent.args.data.type;
    auditDetailsItems.push({
      type: /** @type {const} */ ('debugdata'),
      interactionType,
      phases,
    });

    const duration = interactionEvent.args.data.duration;
    const displayValue = str_(UIStrings.displayValue, {timeInMs: duration, interactionType});

    const passed = duration < InteractionToNextPaint.defaultOptions.p10;

    return {
      score: passed ? 1 : 0,
      scoreDisplayMode: passed ? Audit.SCORING_MODES.INFORMATIVE : undefined,
      displayValue,
      details: {
        type: 'list',
        items: auditDetailsItems,
      },
      metricSavings: {
        INP: duration,
      },
    };
  }
}

export default WorkDuringInteraction;
export {UIStrings};
