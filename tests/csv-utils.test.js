import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { parseCsv, analyze, analyzeCsv, CsvError } from '../csv-utils.js';

const fixture = (name) =>
  readFileSync(fileURLToPath(new URL(`../examples/${name}`, import.meta.url)), 'utf8');

test('parses a valid CSV into header and data rows', () => {
  const { headers, rows } = parseCsv('a,b\n1,2\n3,4\n');
  assert.deepEqual(headers, ['a', 'b']);
  assert.deepEqual(rows, [['1', '2'], ['3', '4']]);
});

test('header is not counted as a data row', () => {
  const result = analyzeCsv('a,b\n1,2\n');
  assert.equal(result.rowCount, 1);
  assert.equal(result.columnCount, 2);
});

test('trailing newline does not create a phantom row', () => {
  assert.equal(analyzeCsv('a\n1\n2\n').rowCount, 2);
  assert.equal(analyzeCsv('a\n1\n2').rowCount, 2);
});

test('counts empty cells as missing', () => {
  const { columns } = analyzeCsv('a,b\n1,\n2,\n');
  assert.equal(columns[1].missing, 2);
  assert.equal(columns[0].missing, 0);
});

test('counts whitespace-only cells as missing', () => {
  const { columns } = analyzeCsv('a\n   \n\t\nx\n');
  assert.equal(columns[0].missing, 2);
});

test('counts absent trailing cells in short rows as missing', () => {
  const { columns, rowCount } = analyzeCsv('a,b,c\n1,2\n');
  assert.equal(rowCount, 1);
  assert.equal(columns[2].missing, 1);
});

test('missing percentage is measured against data rows', () => {
  const { columns } = analyzeCsv('a,b\n,1\n,2\n,3\nx,4\n');
  assert.equal(columns[0].missing, 3);
  assert.equal(columns[0].missingPercent, 75);
});

test('missing percentage rounds to one decimal place', () => {
  const { columns } = analyzeCsv('a\n\n1\n2\n'); // 1 of 3
  assert.equal(columns[0].missingPercent, 33.3);
});

test('counts repeated rows beyond the first occurrence', () => {
  const { duplicateRows } = analyzeCsv('a,b\n1,2\n1,2\n1,2\n3,4\n');
  assert.equal(duplicateRows, 2);
});

test('duplicate comparison trims cells and is case-sensitive', () => {
  assert.equal(analyzeCsv('a\nx\n x \n').duplicateRows, 1, 'trimmed match is a duplicate');
  assert.equal(analyzeCsv('a\nx\nX\n').duplicateRows, 0, 'different case is not a duplicate');
});

test('parses quoted fields containing commas', () => {
  const { rows } = parseCsv('a,b\n"Davis, Dana",1\n');
  assert.deepEqual(rows[0], ['Davis, Dana', '1']);
});

test('parses escaped quotes inside quoted fields', () => {
  const { rows } = parseCsv('a\n"She said ""hi"""\n');
  assert.deepEqual(rows[0], ['She said "hi"']);
});

test('parses newlines embedded in quoted fields', () => {
  const { headers, rows } = parseCsv('a,b\n"line one\nline two",2\n');
  assert.deepEqual(headers, ['a', 'b']);
  assert.equal(rows.length, 1, 'embedded newline must not split the row');
  assert.deepEqual(rows[0], ['line one\nline two', '2']);
});

test('CRLF and LF produce identical results', () => {
  const lf = analyzeCsv('a,b\n1,\n2,3\n');
  const crlf = analyzeCsv('a,b\r\n1,\r\n2,3\r\n');
  assert.deepEqual(crlf, lf);
});

test('strips a UTF-8 BOM from the first column name', () => {
  const { headers } = parseCsv('﻿id,name\n1,Alice\n');
  assert.deepEqual(headers, ['id', 'name']);
});

test('rejects an empty file', () => {
  assert.throws(() => parseCsv(''), CsvError);
});

test('rejects a header-only file', () => {
  assert.throws(() => parseCsv('a,b,c\n'), /no data rows/);
});

test('rejects an unterminated quoted field, naming the line', () => {
  assert.throws(() => parseCsv('a,b\n"oops,1\n'), /opened on line 2/);
});

test('rejects a row with more fields than the header', () => {
  assert.throws(() => parseCsv('a,b\n1,2,3\n'), /row 2 has 3 values/);
});

test('malformed input throws rather than returning wrong statistics', () => {
  assert.throws(() => analyzeCsv('a,b\n1,2,3\n'), CsvError);
});

test('sample-dirty.csv produces its documented results', () => {
  const result = analyzeCsv(fixture('sample-dirty.csv'));

  assert.equal(result.rowCount, 8);
  assert.equal(result.columnCount, 4);
  assert.equal(result.duplicateRows, 2);

  const byName = Object.fromEntries(result.columns.map((c) => [c.name, c]));
  assert.equal(byName.id.missing, 0);
  assert.equal(byName.name.missing, 0);
  assert.equal(byName.email.missing, 4);
  assert.equal(byName.email.missingPercent, 50);
  assert.equal(byName.score.missing, 1);
  assert.equal(byName.score.missingPercent, 12.5);
});

test('analyze is deterministic across repeated runs', () => {
  const text = fixture('sample-dirty.csv');
  assert.deepEqual(analyzeCsv(text), analyzeCsv(text));
});

test('analyze accepts an already-parsed document', () => {
  assert.equal(analyze(parseCsv('a\n1\n')).rowCount, 1);
});
