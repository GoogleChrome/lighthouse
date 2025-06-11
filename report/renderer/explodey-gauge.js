/**
 * @license Copyright 2023 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

/* eslint-env browser */
/* eslint-disable max-len */

import {ReportUtils} from './report-utils.js';

/**
 * @param {import('./dom.js').DOM} dom
 */
function createGauge(dom) {
  const docFrag = dom.createComponent('explodeyGauge');
  return dom.find('.lh-exp-gauge-component', docFrag);
}

/**
 * @param {import('./dom.js').DOM} dom
 * @param {Element} componentEl
 * @param {LH.ReportResult.Category} category
 */
function updateGauge(dom, componentEl, category) {
  const wrapperEl = dom.find('div.lh-exp-gauge__wrapper', componentEl);
  wrapperEl.className = '';
  wrapperEl.classList.add('lh-exp-gauge__wrapper',
    `lh-exp-gauge__wrapper--${ReportUtils.calculateRating(category.score)}`);
  _setPerfGaugeExplodey(dom, wrapperEl, category);
}

/**
 * @param {number} sizeSVG
 * @param {number} percent
 * @param {number=} strokeWidth
 */
function _determineTrig(sizeSVG, percent, strokeWidth) {
  strokeWidth = strokeWidth || sizeSVG / 32;

  const radiusInner = sizeSVG / strokeWidth;
  const strokeGap = 0.5 * strokeWidth;
  const radiusOuter = radiusInner + strokeGap + strokeWidth;

  const circumferenceInner = 2 * Math.PI * radiusInner;
  // arc length we need to subtract
  // for very small strokeWidth:radius ratios this is ≈ strokeWidth
  // angle = acute angle of isosceles △ with 2 edges equal to radius & 3rd equal to strokeWidth
  // angle formula given by law of cosines
  const endDiffInner = Math.acos(1 - 0.5 * Math.pow((0.5 * strokeWidth) / radiusInner, 2)) * radiusInner;

  const circumferenceOuter = 2 * Math.PI * radiusOuter;
  const endDiffOuter = Math.acos(1 - 0.5 * Math.pow((0.5 * strokeWidth) / radiusOuter, 2)) * radiusOuter;

  return {
    radiusInner,
    radiusOuter,
    circumferenceInner,
    circumferenceOuter,
    getArcLength: () => Math.max(0, Number((percent * circumferenceInner))),
    /**
     * @param {number} weightingPct
     * @param {boolean} isButt for metricArcHoverTarget
     */
    getMetricArcLength: (weightingPct, isButt = false) => {
      // TODO: this math isn't perfect butt it's very close.
      const linecapFactor = isButt ? 0 : 2 * endDiffOuter;
      return Math.max(0, Number((weightingPct * circumferenceOuter - strokeGap - linecapFactor)));
    },
    endDiffInner,
    endDiffOuter,
    strokeWidth,
    strokeGap,
  };
}

/**
 * @param {import('./dom.js').DOM} dom
 * @param {HTMLElement} wrapperEl
 * @param {LH.ReportResult.Category} category
 */
function _setPerfGaugeExplodey(dom, wrapperEl, category) {
  const sizeSVG = 128;
  const offsetSVG = -0.5 * sizeSVG;

  const percent = Number(category.score);
  const {
    radiusInner,
    radiusOuter,
    circumferenceInner,
    circumferenceOuter,
    getArcLength,
    getMetricArcLength,
    endDiffInner,
    endDiffOuter,
    strokeWidth,
    strokeGap,
  } = _determineTrig(sizeSVG, percent);

  const SVG = dom.find('svg.lh-exp-gauge', wrapperEl);

  dom.find('.lh-exp-gauge__label', SVG).textContent = category.title;

  SVG.setAttribute('viewBox', [offsetSVG, offsetSVG / 2, sizeSVG, sizeSVG / 2].join(' '));
  SVG.style.setProperty('--stroke-width', `${strokeWidth}px`);
  SVG.style.setProperty('--circle-meas', (2 * Math.PI).toFixed(4));

  const groupOuter = dom.find('g.lh-exp-gauge__outer', wrapperEl);
  const groupInner = dom.find('g.lh-exp-gauge__inner', wrapperEl);
  const cover = dom.find('circle.lh-cover', groupOuter);
  const gaugeArc = dom.find('circle.lh-exp-gauge__arc', groupInner);
  const gaugePerc = dom.find('text.lh-exp-gauge__percentage', groupInner);

  groupOuter.style.setProperty('--scale-initial', String(radiusInner / radiusOuter));
  groupOuter.style.setProperty('--radius', `${radiusOuter}px`);
  cover.style.setProperty('--radius', `${0.5 * (radiusInner + radiusOuter)}px`);
  cover.setAttribute('stroke-width', String(strokeGap));
  SVG.style.setProperty('--radius', `${radiusInner}px`);

  gaugeArc.setAttribute('stroke-dasharray',
    `${getArcLength()} ${(circumferenceInner - getArcLength()).toFixed(4)}`);
  gaugeArc.setAttribute('stroke-dashoffset', String(0.25 * circumferenceInner - endDiffInner));

  gaugePerc.textContent = Math.round(percent * 100).toString();

  const radiusTextOuter = radiusOuter + strokeWidth;
  const radiusTextInner = radiusOuter - strokeWidth;

  const metrics = category.auditRefs.filter(r => r.group === 'metrics' && r.weight);
  const totalWeight = metrics.reduce((sum, each) => (sum += each.weight), 0);
  let offsetAdder = 0.25 * circumferenceOuter - endDiffOuter - 0.5 * strokeGap;
  let angleAdder = -0.5 * Math.PI;

  // Extra hack on top of the HACK for element reuse below. Delete any metric elems that aren't needed anymore (happens when the same gauge goes from v5 to v6)
  groupOuter.querySelectorAll('.metric').forEach(metricElem => {
    const classNamesToRetain = metrics.map(metric => `metric--${metric.id}`);
    const match = classNamesToRetain.find(selector => metricElem.classList.contains(selector));
    if (!match) metricElem.remove();
  });

  metrics.forEach((metric, i) => {
    const alias = metric.acronym ?? metric.id;

    // Hack
    const needsDomPopulation = !groupOuter.querySelector(`.metric--${alias}`);

    // HACK:This isn't ideal but it was quick. Create element during initialization or reuse existing during updates
    const metricGroup = dom.maybeFind(`g.metric--${alias}`, groupOuter) || dom.createSVGElement('g');
    const metricArcMax = dom.maybeFind(`.metric--${alias} circle.lh-exp-gauge--faded`, groupOuter) || dom.createSVGElement('circle');
    const metricArc = dom.maybeFind(`.metric--${alias} circle.lh-exp-gauge--miniarc`, groupOuter) || dom.createSVGElement('circle');
    const metricArcHoverTarget = dom.maybeFind(`.metric--${alias} circle.lh-exp-gauge-hovertarget`, groupOuter) || dom.createSVGElement('circle');
    const metricLabel = dom.maybeFind(`.metric--${alias} text.metric__label`, groupOuter) || dom.createSVGElement('text');
    const metricValue = dom.maybeFind(`.metric--${alias} text.metric__value`, groupOuter) || dom.createSVGElement('text');

    metricGroup.classList.add('metric', `metric--${alias}`);
    metricArcMax.classList.add('lh-exp-gauge__arc', 'lh-exp-gauge__arc--metric', 'lh-exp-gauge--faded');
    metricArc.classList.add('lh-exp-gauge__arc', 'lh-exp-gauge__arc--metric', 'lh-exp-gauge--miniarc');
    metricArcHoverTarget.classList.add('lh-exp-gauge__arc', 'lh-exp-gauge__arc--metric', 'lh-exp-gauge-hovertarget');

    const weightingPct = metric.weight / totalWeight;
    const metricLengthMax = getMetricArcLength(weightingPct);
    const metricPercent = metric.result.score ? metric.result.score * weightingPct : 0;
    const metricLength = getMetricArcLength(metricPercent);
    const metricOffset = weightingPct * circumferenceOuter;
    const metricHoverLength = getMetricArcLength(weightingPct, true);
    const rating = ReportUtils.calculateRating(metric.result.score, metric.result.scoreDisplayMode);

    metricGroup.style.setProperty('--metric-rating', rating);
    metricGroup.style.setProperty('--metric-color', `var(--color-${rating})`);
    metricGroup.style.setProperty('--metric-offset', `${offsetAdder}`);
    metricGroup.style.setProperty('--i', i.toString());

    metricArcMax.setAttribute('stroke-dasharray', `${metricLengthMax} ${circumferenceOuter - metricLengthMax}`);
    metricArc.style.setProperty('--metric-array', `${metricLength} ${circumferenceOuter - metricLength}`);
    metricArcHoverTarget.setAttribute('stroke-dasharray', `${metricHoverLength} ${circumferenceOuter - metricHoverLength - endDiffOuter}`);

    metricLabel.classList.add('metric__label');
    metricValue.classList.add('metric__value');
    metricLabel.textContent = alias;
    metricValue.textContent = `+${Math.round(metricPercent * 100)}`;

    const midAngle = angleAdder + weightingPct * Math.PI;
    const cos = Math.cos(midAngle);
    const sin = Math.sin(midAngle);

    // only set non-default alignments
    switch (true) {
      case cos > 0:
        metricValue.setAttribute('text-anchor', 'end');
        break;
      case cos < 0:
        metricLabel.setAttribute('text-anchor', 'end');
        break;
      case cos === 0:
        metricLabel.setAttribute('text-anchor', 'middle');
        metricValue.setAttribute('text-anchor', 'middle');
        break;
    }

    switch (true) {
      case sin > 0:
        metricLabel.setAttribute('dominant-baseline', 'hanging');
        break;
      case sin < 0:
        metricValue.setAttribute('dominant-baseline', 'hanging');
        break;
      case sin === 0:
        metricLabel.setAttribute('dominant-baseline', 'middle');
        metricValue.setAttribute('dominant-baseline', 'middle');
        break;
    }

    metricLabel.setAttribute('x', (radiusTextOuter * cos).toFixed(2));
    metricLabel.setAttribute('y', (radiusTextOuter * sin).toFixed(2));
    metricValue.setAttribute('x', (radiusTextInner * cos).toFixed(2));
    metricValue.setAttribute('y', (radiusTextInner * sin).toFixed(2));

    if (needsDomPopulation) {
      metricGroup.appendChild(metricArcMax);
      metricGroup.appendChild(metricArc);
      metricGroup.appendChild(metricArcHoverTarget);
      metricGroup.appendChild(metricLabel);
      metricGroup.appendChild(metricValue);
      groupOuter.appendChild(metricGroup);
    }

    offsetAdder -= metricOffset;
    angleAdder += weightingPct * 2 * Math.PI;
  });

  // Catch pointerover movement between the hovertarget arcs. Without this the metric-highlights can clear when moving between.
  const underHoverTarget = groupOuter.querySelector(`.lh-exp-gauge-underhovertarget`) || dom.createSVGElement('circle');
  underHoverTarget.classList.add('lh-exp-gauge__arc', 'lh-exp-gauge__arc--metric', 'lh-exp-gauge-hovertarget', 'lh-exp-gauge-underhovertarget');
  const underHoverLength = getMetricArcLength(1, true);
  underHoverTarget.setAttribute('stroke-dasharray', `${underHoverLength} ${circumferenceOuter - underHoverLength - endDiffOuter}`);
  if (!underHoverTarget.isConnected) {
    groupOuter.prepend(underHoverTarget);
  }

  // Hack. Not ideal.
  if (SVG.dataset.listenersSetup) return;
  // @ts-expect-error
  SVG.dataset.listenersSetup = true;

  peekGauge(SVG);

  /*
    wrapperEl.state-expanded: gauge is exploded
    wrapperEl.state-highlight: gauge is exploded and one of the metrics is being highlighted
    metric.metric-highlight: highlight this particular metric
  */
  SVG.addEventListener('pointerover', e => {
    // If hovering outside of the arcs, reset back to unexploded state
    if (e.target === SVG && SVG.classList.contains('state--expanded')) {
      SVG.classList.remove('state--expanded');

      if (SVG.classList.contains('state--highlight')) {
        SVG.classList.remove('state--highlight');
        dom.find('.metric--highlight', SVG).classList.remove('metric--highlight');
      }
      return;
    }

    if (!(e.target instanceof Element)) {
      return;
    }

    const parentEl = e.target.parentNode;
    if (!(parentEl instanceof SVGElement)) {
      return;
    }

    // if hovering on the primary (inner) part, then explode it but dont highlight
    if (parentEl && parentEl === groupInner) {
      if (!SVG.classList.contains('state--expanded')) SVG.classList.add('state--expanded');
      else if (SVG.classList.contains('state--highlight')) {
        SVG.classList.remove('state--highlight');
        dom.find('.metric--highlight', SVG).classList.remove('metric--highlight');
      }
      return;
    }

    // if hovering on a metric, highlight that one.
    // TODO: The hover target is a little small. ideally it's thicker.
    if (parentEl && parentEl.classList && parentEl.classList.contains('metric')) {
      // match the bg color of the gauge during a metric highlight
      const metricRating = parentEl.style.getPropertyValue('--metric-rating');
      wrapperEl.style.setProperty('--color-highlight', `var(--color-${metricRating}-secondary)`);

      if (!SVG.classList.contains('state--highlight')) {
        SVG.classList.add('state--highlight');
        parentEl.classList.add('metric--highlight');
      } else {
        const highlightEl = dom.find('.metric--highlight', SVG);

        if (parentEl !== highlightEl) {
          highlightEl.classList.remove('metric--highlight');
          parentEl.classList.add('metric--highlight');
        }
      }
    }
  });

  // clear on mouselave even if mousemove didn't catch it.
  SVG.addEventListener('mouseleave', () => {
    // SVG.classList.remove('state--expanded');
    SVG.classList.remove('state--highlight');
    const mh = SVG.querySelector('.metric--highlight');
    mh?.classList.remove('metric--highlight');
  });

  /**
   * On the first run, tease with a little peek reveal
   * @param {SVGElement} SVG
   */
  async function peekGauge(SVG) {
    // Delay just a tad to let the user aclimatize beforehand.
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Early exit if it's already engaged
    if (SVG.classList.contains('state--expanded')) return;

    // To visually get the outer ring to peek on the edge, we need the inner ring on top. This is SVG's equivalent to `innerElem.zIndex = 100`
    const inner = dom.find('.lh-exp-gauge__inner', SVG);
    const id = `uniq-${Math.random()}`;
    inner.setAttribute('id', id);
    const useElem = dom.createSVGElement('use');
    useElem.setAttribute('href', `#${id}`);
    // for paint order this must come _after_ the outer.
    SVG.appendChild(useElem);

    const peekDurationSec = 2.5;
    SVG.style.setProperty('--peek-dur', `${peekDurationSec}s`);
    SVG.classList.add('state--peek', 'state--expanded');

    // Fancy double cleanup
    const cleanup = () => {
      SVG.classList.remove('state--peek', 'state--expanded');
      useElem.remove();
    };
    const tId = setTimeout(() => {
      SVG.removeEventListener('mouseenter', handleEarlyInteraction);
      cleanup();
    }, peekDurationSec * 1000 * 1.5); // lil extra time just cuz
    function handleEarlyInteraction() {
      clearTimeout(tId);
      cleanup();
    }
    SVG.addEventListener('mouseenter', handleEarlyInteraction, {once: true});
  }
}

export {
  createGauge,
  updateGauge,
};
