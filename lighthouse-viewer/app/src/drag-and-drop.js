/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Manages drag and drop file input for the page.
 */
class DragAndDrop {
  /**
   * @param {function(File): void} fileHandlerCallback Invoked when the user chooses a new file.
   */
  constructor(fileHandlerCallback) {
    const dropZone = document.querySelector('.drop_zone');
    if (!dropZone) {
      throw new Error('Drag and drop `.drop_zone` element not found in page');
    }

    this._dropZone = dropZone;
    this._fileHandlerCallback = fileHandlerCallback;
    this._dragging = false;

    this._addListeners();
  }

  _addListeners() {
    // The mouseleave event is more reliable than dragleave when the user drops
    // the file outside the window.
    document.addEventListener('mouseleave', _ => {
      if (!this._dragging) {
        return;
      }
      this._resetDraggingUI();
    });

    document.addEventListener('dragover', e => {
      e.stopPropagation();
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy'; // Explicitly show as copy action.
      }
    });

    document.addEventListener('dragenter', _ => {
      this._dropZone.classList.add('dropping');
      this._dragging = true;
    });

    document.addEventListener('drop', e => {
      e.stopPropagation();
      e.preventDefault();

      this._resetDraggingUI();

      // Note, this ignores multiple files in the drop, only taking the first.
      if (e.dataTransfer) {
        this._fileHandlerCallback(e.dataTransfer.files[0]);
      }
    });
  }

  _resetDraggingUI() {
    this._dropZone.classList.remove('dropping');
    this._dragging = false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DragAndDrop;
}
