/**
 * DOM wiring for CSV Quality Checker.
 *
 * All parsing and metric logic lives in csv-utils.js; this file only moves data
 * between the file input and the page.
 */

import { analyzeCsv, CsvError, MAX_FILE_BYTES } from './csv-utils.js';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const filenameEl = document.getElementById('filename');
const errorEl = document.getElementById('error');
const resultsEl = document.getElementById('results');
const missingBody = document.getElementById('missing-body');

const megabytes = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

function showError(message) {
  resultsEl.hidden = true;
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = '';
}

function render(result) {
  document.getElementById('m-rows').textContent = result.rowCount.toLocaleString();
  document.getElementById('m-cols').textContent = result.columnCount.toLocaleString();
  document.getElementById('m-dupes').textContent = result.duplicateRows.toLocaleString();

  missingBody.replaceChildren();
  for (const column of result.columns) {
    const tr = document.createElement('tr');
    if (column.missing > 0) tr.className = 'has-missing';

    const name = document.createElement('th');
    name.scope = 'row';
    // textContent, never innerHTML: column names come from an untrusted file.
    name.textContent = column.name === '' ? '(unnamed column)' : column.name;

    const missing = document.createElement('td');
    missing.className = 'num';
    missing.textContent = column.missing.toLocaleString();

    const percent = document.createElement('td');
    percent.className = 'num';
    percent.textContent = `${column.missingPercent}%`;

    tr.append(name, missing, percent);
    missingBody.append(tr);
  }

  resultsEl.hidden = false;
}

function handleFile(file) {
  clearError();
  filenameEl.textContent = `Selected: ${file.name}`;
  filenameEl.hidden = false;

  if (file.size > MAX_FILE_BYTES) {
    showError(
      `This file is ${megabytes(file.size)} MB, which is over the 5 MB limit. ` +
        'The whole file is analyzed in memory in your browser, and larger files ' +
        'would freeze the page.'
    );
    return;
  }

  if (file.size === 0) {
    showError('This file is empty, so there is nothing to analyze.');
    return;
  }

  const reader = new FileReader();

  reader.onerror = () => {
    showError('That file could not be read. It may have been moved or renamed.');
  };

  reader.onload = () => {
    try {
      render(analyzeCsv(reader.result));
    } catch (err) {
      // CsvError messages are written for users; anything else is a real bug.
      if (err instanceof CsvError) {
        showError(err.message);
      } else {
        showError('Something went wrong while analyzing this file.');
        console.error(err);
      }
    }
  };

  reader.readAsText(file);
}

fileInput.addEventListener('change', () => {
  const [file] = fileInput.files;
  if (file) handleFile(file);
});

// Drag and drop. The dragover default must be prevented or the browser opens
// the file instead of firing our drop handler.
for (const type of ['dragenter', 'dragover']) {
  dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });
}

for (const type of ['dragleave', 'drop']) {
  dropzone.addEventListener(type, () => dropzone.classList.remove('dragover'));
}

dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  const [file] = event.dataTransfer.files;
  if (file) handleFile(file);
});
