/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview These functions define {Rect}s and {Size}s using two different coordinate spaces:
 *   1. Screenshot coords (SC suffix): where 0,0 is the top left of the screenshot image
 *   2. Display coords (DC suffix): that match the CSS pixel coordinate space of the LH report's page.
 */

/* globals self Util */

/** @typedef {import('./dom.js')} DOM */
/** @typedef {LH.Artifacts.Rect} Rect */
/** @typedef {{width: number, height: number}} Size */

/**
 * @typedef InstallOverlayFeatureParams
 * @property {DOM} dom
 * @property {Element} reportEl
 * @property {Element} overlayContainerEl
 * @property {ParentNode} templateContext
 * @property {LH.Artifacts.FullPageScreenshot} fullPageScreenshot
 */

/**
 * @param {LH.Artifacts.FullPageScreenshot['screenshot']} screenshot
 * @param {LH.Artifacts.Rect} rect
 * @return {boolean}
 */
function screenshotOverlapsRect(screenshot, rect) {
  return rect.left <= screenshot.width &&
    0 <= rect.right &&
    rect.top <= screenshot.height &&
    0 <= rect.bottom;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * @param {Rect} rect
 */
function getRectCenterPoint(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

class ElementScreenshotRenderer {
  /**
   * Given the location of an element and the sizes of the preview and screenshot,
   * compute the absolute positions (in screenshot coordinate scale) of the screenshot content
   * and the highlighted rect around the element.
   * @param {Rect} elementRectSC
   * @param {Size} elementPreviewSizeSC
   * @param {Size} screenshotSize
   */
  static getScreenshotPositions(elementRectSC, elementPreviewSizeSC, screenshotSize) {
    const elementRectCenter = getRectCenterPoint(elementRectSC);

    // Try to center clipped region.
    const screenshotLeftVisibleEdge = clamp(
      elementRectCenter.x - elementPreviewSizeSC.width / 2,
      0, screenshotSize.width - elementPreviewSizeSC.width
    );
    const screenshotTopVisisbleEdge = clamp(
      elementRectCenter.y - elementPreviewSizeSC.height / 2,
      0, screenshotSize.height - elementPreviewSizeSC.height
    );

    return {
      screenshot: {
        left: screenshotLeftVisibleEdge,
        top: screenshotTopVisisbleEdge,
      },
      clip: {
        left: elementRectSC.left - screenshotLeftVisibleEdge,
        top: elementRectSC.top - screenshotTopVisisbleEdge,
      },
    };
  }

  /**
   * Render a clipPath SVG element to assist marking the element's rect.
   * The elementRect and previewSize are in screenshot coordinate scale.
   * @param {DOM} dom
   * @param {HTMLElement} maskEl
   * @param {{left: number, top: number}} positionClip
   * @param {LH.Artifacts.Rect} elementRect
   * @param {Size} elementPreviewSize
   */
  static renderClipPathInScreenshot(dom, maskEl, positionClip, elementRect, elementPreviewSize) {
    const clipPathEl = dom.find('clipPath', maskEl);
    const clipId = `clip-${Util.getUniqueSuffix()}`;
    clipPathEl.id = clipId;
    maskEl.style.clipPath = `url(#${clipId})`;

    // Normalize values between 0-1.
    const top = positionClip.top / elementPreviewSize.height;
    const bottom = top + elementRect.height / elementPreviewSize.height;
    const left = positionClip.left / elementPreviewSize.width;
    const right = left + elementRect.width / elementPreviewSize.width;

    const polygonsPoints = [
      `0,0             1,0            1,${top}          0,${top}`,
      `0,${bottom}     1,${bottom}    1,1               0,1`,
      `0,${top}        ${left},${top} ${left},${bottom} 0,${bottom}`,
      `${right},${top} 1,${top}       1,${bottom}       ${right},${bottom}`,
    ];
    for (const points of polygonsPoints) {
      clipPathEl.append(dom.createElementSVG('polygon', {points}));
    }
  }

  /**
   * Called by report renderer. Defines a css variable used by any element screenshots
   * in the provided report element.
   * Allows for multiple Lighthouse reports to be rendered on the page, each with their
   * own full page screenshot.
   * @param {HTMLElement} el
   * @param {LH.Artifacts.FullPageScreenshot['screenshot']} screenshot
   */
  static installFullPageScreenshot(el, screenshot) {
    el.style.setProperty('--element-screenshot-url', `url(${screenshot.data})`);
  }

  /**
   * Installs the lightbox elements and wires up click listeners to all .lh-element-screenshot elements.
   * @param {InstallOverlayFeatureParams} opts
   */
  static installOverlayFeature(opts) {
    const {dom, reportEl, overlayContainerEl, templateContext, fullPageScreenshot} = opts;
    const screenshotOverlayClass = 'lh-screenshot-overlay--enabled';
    // Don't install the feature more than once.
    if (reportEl.classList.contains(screenshotOverlayClass)) return;
    reportEl.classList.add(screenshotOverlayClass);

    // Add a single listener to the provided element to handle all clicks within (event delegation).
    reportEl.addEventListener('click', e => {
      const target = /** @type {?HTMLElement} */ (e.target);
      if (!target) return;
      // Only activate the overlay for clicks on the screenshot *preview* of an element, not the full-size too.
      const el = /** @type {?HTMLElement} */ (target.closest('.lh-node > .lh-element-screenshot'));
      if (!el) return;

      const overlay = dom.createElement('div', 'lh-element-screenshot__overlay');
      overlayContainerEl.append(overlay);

      // The newly-added overlay has the dimensions we need.
      const maxLightboxSize = {
        width: overlay.clientWidth * 0.95,
        height: overlay.clientHeight * 0.80,
      };

      const elementRectSC = {
        width: Number(el.dataset['rectWidth']),
        height: Number(el.dataset['rectHeight']),
        left: Number(el.dataset['rectLeft']),
        right: Number(el.dataset['rectLeft']) + Number(el.dataset['rectWidth']),
        top: Number(el.dataset['rectTop']),
        bottom: Number(el.dataset['rectTop']) + Number(el.dataset['rectHeight']),
      };
      const screenshotElement = ElementScreenshotRenderer.render(
        dom,
        templateContext,
        fullPageScreenshot.screenshot,
        elementRectSC,
        maxLightboxSize
      );

      // This would be unexpected here.
      // When `screenshotElement` is `null`, there is also no thumbnail element for the user to have clicked to make it this far.
      if (!screenshotElement) {
        overlay.remove();
        return;
      }
      overlay.appendChild(screenshotElement);
      overlay.addEventListener('click', () => overlay.remove());
    });
  }

  /**
   * Given the size of the element in the screenshot and the total available size of our preview container,
   * compute the factor by which we need to zoom out to view the entire element with context.
   * @param {LH.Artifacts.Rect} elementRectSC
   * @param {Size} renderContainerSizeDC
   * @return {number}
   */
  static _computeZoomFactor(elementRectSC, renderContainerSizeDC) {
    const targetClipToViewportRatio = 0.75;
    const zoomRatioXY = {
      x: renderContainerSizeDC.width / elementRectSC.width,
      y: renderContainerSizeDC.height / elementRectSC.height,
    };
    const zoomFactor = targetClipToViewportRatio * Math.min(zoomRatioXY.x, zoomRatioXY.y);
    return Math.min(1, zoomFactor);
  }

  /**
   * Renders an element with surrounding context from the full page screenshot.
   * Used to render both the thumbnail preview in details tables and the full-page screenshot in the lightbox.
   * Returns null if element rect is outside screenshot bounds.
   * @param {DOM} dom
   * @param {ParentNode} templateContext
   * @param {LH.Artifacts.FullPageScreenshot['screenshot']} screenshot
   * @param {LH.Artifacts.Rect} elementRectSC Region of screenshot to highlight.
   * @param {Size} maxRenderSizeDC e.g. maxThumbnailSize or maxLightboxSize.
   * @return {Element|null}
   */
  static render(dom, templateContext, screenshot, elementRectSC, maxRenderSizeDC) {
    if (!screenshotOverlapsRect(screenshot, elementRectSC)) {
      return null;
    }

    const tmpl = dom.cloneTemplate('#tmpl-lh-element-screenshot', templateContext);
    const containerEl = dom.find('div.lh-element-screenshot', tmpl);

    containerEl.dataset['rectWidth'] = elementRectSC.width.toString();
    containerEl.dataset['rectHeight'] = elementRectSC.height.toString();
    containerEl.dataset['rectLeft'] = elementRectSC.left.toString();
    containerEl.dataset['rectTop'] = elementRectSC.top.toString();

    // Zoom out when highlighted region takes up most of the viewport.
    // This provides more context for where on the page this element is.
    const zoomFactor = this._computeZoomFactor(elementRectSC, maxRenderSizeDC);

    const elementPreviewSizeSC = {
      width: maxRenderSizeDC.width / zoomFactor,
      height: maxRenderSizeDC.height / zoomFactor,
    };
    elementPreviewSizeSC.width = Math.min(screenshot.width, elementPreviewSizeSC.width);
    /* This preview size is either the size of the thumbnail or size of the Lightbox */
    const elementPreviewSizeDC = {
      width: elementPreviewSizeSC.width * zoomFactor,
      height: elementPreviewSizeSC.height * zoomFactor,
    };

    const positions = ElementScreenshotRenderer.getScreenshotPositions(
      elementRectSC,
      elementPreviewSizeSC,
      {width: screenshot.width, height: screenshot.height}
    );

    const contentEl = dom.find('div.lh-element-screenshot__content', containerEl);
    contentEl.style.top = `-${elementPreviewSizeDC.height}px`;

    const imageEl = dom.find('div.lh-element-screenshot__image', containerEl);
    imageEl.style.width = elementPreviewSizeDC.width + 'px';
    imageEl.style.height = elementPreviewSizeDC.height + 'px';

    imageEl.style.backgroundPositionY = -(positions.screenshot.top * zoomFactor) + 'px';
    imageEl.style.backgroundPositionX = -(positions.screenshot.left * zoomFactor) + 'px';
    imageEl.style.backgroundSize =
      `${screenshot.width * zoomFactor}px ${screenshot.height * zoomFactor}px`;

    const markerEl = dom.find('div.lh-element-screenshot__element-marker', containerEl);
    markerEl.style.width = elementRectSC.width * zoomFactor + 'px';
    markerEl.style.height = elementRectSC.height * zoomFactor + 'px';
    markerEl.style.left = positions.clip.left * zoomFactor + 'px';
    markerEl.style.top = positions.clip.top * zoomFactor + 'px';

    const maskEl = dom.find('div.lh-element-screenshot__mask', containerEl);
    maskEl.style.width = elementPreviewSizeDC.width + 'px';
    maskEl.style.height = elementPreviewSizeDC.height + 'px';

    ElementScreenshotRenderer.renderClipPathInScreenshot(
      dom,
      maskEl,
      positions.clip,
      elementRectSC,
      elementPreviewSizeSC
    );

    return containerEl;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElementScreenshotRenderer;
} else {
  self.ElementScreenshotRenderer = ElementScreenshotRenderer;
}
