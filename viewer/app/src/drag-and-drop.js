/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* global logger */

/**
 * Manages drag and drop file input for the page.
 */
export class DragAndDrop {
  /**
   * @param {function(string): void} fileHandlerCallback Invoked when the user chooses a new file.
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

  /**
   * Reads a file and returns its content as a string.
   * @param {File} file
   * @return {Promise<string>}
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const result = /** @type {?string} */ (e.target?.result);
        if (!result) {
          reject(new Error('Could not read file'));
          return;
        }
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
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
        this.readFile(e.dataTransfer.files[0]).then((str) => {
          this._fileHandlerCallback(str);
        }).catch(e => logger.error(e));
      }
    });
  }

  _resetDraggingUI() {
    this._dropZone.classList.remove('dropping');
    this._dragging = false;
  }
}
