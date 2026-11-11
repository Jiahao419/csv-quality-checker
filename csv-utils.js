/**
 * CSV parsing and data quality metrics.
 *
 * Pure functions only - no DOM access - so this module can be imported by the
 * browser and by the Node test suite without a headless browser.
 *
 * Definitions (also stated in SPEC.md and in the interface):
 *   - The header row is not a data row.
 *   - A cell is missing if it is empty or whitespace-only.
 *   - Missing percentage is measured against the number of data rows.
 *   - A duplicate is a repeated data row beyond its first occurrence, compared
 *     on trimmed cell values, case-sensitively.
 */

/** Largest file we accept. The whole file is parsed synchronously in memory. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Thrown for input we refuse to analyze, so callers can show the message as-is. */
export class CsvError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CsvError';
  }
}

/**
 * Split CSV text into records. Handles quoted fields, escaped quotes, embedded
 * newlines, CRLF/LF endings and a UTF-8 BOM.
 *
 * @param {string} text
 * @returns {string[][]} one array of fields per record, header first
 */
function splitRecords(text) {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const records = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  // True once the current field has any content or an opening quote, so that a
  // final field that parses to empty (a bare "" at end of file) is still a field.
  let pendingField = false;
  let quoteStartLine = 1;
  let line = 1;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = '';
    pendingField = false;
  };
  const endRecord = () => {
    endField();
    records.push(row);
    row = [];
  };

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"'; // escaped quote
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      if (ch === '\n') line += 1;
      pendingField = true;
      field += ch; // newlines and commas are literal inside quotes
      i += 1;
      continue;
    }

    if (ch === '"' && field === '') {
      inQuotes = true;
      pendingField = true;
      quoteStartLine = line;
      i += 1;
      continue;
    }

    if (ch === ',') {
      endField();
      i += 1;
      continue;
    }

    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && input[i + 1] === '\n') i += 1; // CRLF counts once
      endRecord();
      line += 1;
      i += 1;
      continue;
    }

    // A quote inside an already-started unquoted field is kept literally.
    pendingField = true;
    field += ch;
    i += 1;
  }

  if (inQuotes) {
    throw new CsvError(
      `Malformed CSV: a quoted value opened on line ${quoteStartLine} is never closed.`
    );
  }

  // Flush a final record that is not newline-terminated. pendingField covers the
  // case where the last field was quoted but empty ("" at end of file), which has
  // no leftover text yet is still a real field.
  if (pendingField || field !== '' || row.length > 0) endRecord();

  return records;
}

/**
 * Parse CSV text into a header and data rows, rejecting input whose statistics
 * could not be trusted.
 *
 * @param {string} text
 * @returns {{headers: string[], rows: string[][]}}
 */
export function parseCsv(text) {
  if (typeof text !== 'string') {
    throw new CsvError('Expected CSV text.');
  }

  const records = splitRecords(text);

  if (records.length === 0) {
    throw new CsvError('This file is empty, so there is nothing to analyze.');
  }

  const [headers, ...rows] = records;

  if (rows.length === 0) {
    throw new CsvError(
      'This file has a header row but no data rows, so there is nothing to analyze.'
    );
  }

  // More fields than the header usually means a delimiter or quoting bug, and
  // the resulting counts would be misleading. Fewer fields is tolerated: the
  // absent trailing cells are counted as missing.
  rows.forEach((row, index) => {
    if (row.length > headers.length) {
      throw new CsvError(
        `Malformed CSV: row ${index + 2} has ${row.length} values but the header ` +
          `defines ${headers.length} columns. Check for an unquoted comma.`
      );
    }
  });

  return { headers, rows };
}

/** A cell is missing when it is absent, empty, or whitespace-only. */
function isMissing(value) {
  return value === undefined || value.trim() === '';
}

/**
 * Compute quality metrics for parsed CSV data.
 *
 * @param {{headers: string[], rows: string[][]}} parsed
 */
export function analyze({ headers, rows }) {
  const rowCount = rows.length;

  const columns = headers.map((name, index) => {
    let missing = 0;
    for (const row of rows) {
      if (isMissing(row[index])) missing += 1;
    }
    return {
      name,
      missing,
      // Measured against data rows, not column count. One decimal place.
      missingPercent: rowCount === 0 ? 0 : Math.round((missing / rowCount) * 1000) / 10,
    };
  });

  // JSON encoding of the trimmed cells gives a collision-free key, so a value
  // containing the separator cannot fake a duplicate.
  const seen = new Set();
  let duplicateRows = 0;
  for (const row of rows) {
    const key = JSON.stringify(headers.map((_, i) => (row[i] ?? '').trim()));
    if (seen.has(key)) duplicateRows += 1;
    else seen.add(key);
  }

  return { rowCount, columnCount: headers.length, columns, duplicateRows };
}

/** Convenience wrapper: parse then analyze. */
export function analyzeCsv(text) {
  return analyze(parseCsv(text));
}
