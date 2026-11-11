# SPEC — CSV Quality Checker

## Problem statement

Before anyone can trust an unfamiliar CSV dataset, they need to answer three basic
questions: how many data rows does it actually contain, which columns have gaps, and are
any rows duplicated? Today that means writing throwaway pandas code or pasting the data
into an online service. The first option assumes Python fluency; the second means handing
a dataset to a remote server, which is unacceptable for coursework, unpublished research,
or anything containing personal information.

## Target users

Students, data science learners, researchers, and data analysts who need an initial
inspection of an unfamiliar CSV dataset.

## Scope sentence

> Students and data analysts waste time checking CSV datasets manually. The smallest
> version is a one-page tool that reads a CSV file locally and reports missing values,
> duplicate rows, and basic dataset statistics.

## MVP features

1. **File input** — select a CSV via a file picker, or drag and drop it onto a drop zone.
2. **Quality analysis** — report total data rows, total columns, missing cells per column
   (count and percentage), and duplicate data row count.
3. **Presentation** — display results and errors clearly in a responsive one-page
   interface.

## Out of scope

No login or accounts. No database or server-side storage. No backend or paid API. No LLM
dependency. No data-cleaning pipeline. No Excel/XLSX parsing. No charts or machine
learning. No frameworks.

Report export may be considered only after the MVP works and is tested.

## Technical architecture

Vanilla HTML, CSS, and JavaScript with no build step and no runtime dependencies.

| File | Responsibility |
| --- | --- |
| `index.html` | Page structure and content |
| `style.css` | Layout, responsive rules, focus styles |
| `csv-utils.js` | Pure functions: CSV parsing and quality metrics. No DOM access. |
| `script.js` | DOM wiring: file input, drag/drop, rendering, error display |
| `tests/csv-utils.test.js` | Node test runner suite against `csv-utils.js` |

`csv-utils.js` is an ES module exporting pure functions. The browser loads it with
`<script type="module">`; the Node test suite imports the same file. One implementation,
two consumers, no bundler and no duplicated logic.

Keeping all parsing logic free of DOM access is what makes the metrics testable in Node
without a browser or a headless-browser dependency.

## CSV parsing rules

The parser is written by hand (RFC 4180 shaped) to avoid a CDN dependency. It handles:

- A header row, taken as the column names
- Comma-separated fields
- Quoted fields containing commas
- Escaped quotes inside quoted fields (`""`)
- Embedded line breaks inside quoted fields
- Windows (`\r\n`) and Unix (`\n`) line endings
- UTF-8 BOM, stripped before parsing
- Empty cells

### Error conditions

These produce an informative error instead of misleading statistics:

| Condition | Behavior |
| --- | --- |
| Empty file / header only | Error: no data rows to analyze |
| Unterminated quoted field | Error naming the line where the quote opened |
| Row with more fields than the header | Error: malformed row, reporting the row number |
| File larger than 5 MB | Error before parsing (see below) |

A row with **fewer** fields than the header is accepted, and its absent trailing cells are
counted as missing. This is a deliberate choice: short rows are a common and recoverable
export artifact, whereas extra fields usually signal a genuine delimiter or quoting bug
whose statistics cannot be trusted.

### File size limit

5 MB. The whole file is read into memory as a string and analyzed synchronously, which
would block the UI thread on larger inputs. The limit is stated in the interface, and the
error explains why rather than failing silently.

## Metric definitions

- **Data rows** — total rows excluding the header.
- **Columns** — number of fields in the header row.
- **Missing cell** — a cell that is empty or contains only whitespace.
- **Missing percentage** — missing cells in a column ÷ total data rows × 100, rounded to
  one decimal place. Calculated against data rows, never against column count.
- **Duplicate data rows** — repeated rows beyond the first occurrence. Comparison uses
  trimmed cell values and is case-sensitive. Three identical rows count as two duplicates.

All metrics are deterministic so they can be verified against fixtures.

## Acceptance criteria

1. Selecting or dropping a valid CSV displays row count, column count, a per-column
   missing table, and duplicate count.
2. `examples/sample-dirty.csv` produces the exact counts recorded in the test suite.
3. The header is excluded from the data row count.
4. Whitespace-only cells count as missing.
5. Quoted commas, escaped quotes, and multiline quoted fields parse correctly.
6. CRLF and LF files produce identical results.
7. A UTF-8 BOM does not corrupt the first column name.
8. Malformed CSV shows an explanatory error and no statistics.
9. A file over 5 MB is rejected with a clear message.
10. The layout is usable at 375 px and at desktop width.
11. All controls are keyboard reachable with a visible focus indicator.
12. No network request carries file contents (verifiable in the Network panel).
13. `node --test tests/` passes.

## Local run instructions

No build step and no dependencies:

```bash
git clone git@github.com:Jiahao419/csv-quality-checker.git
cd csv-quality-checker
python3 -m http.server 8000
```

Open `http://localhost:8000`.

A local server is required rather than opening `index.html` directly, because ES modules
are blocked by the browser's `file://` origin policy.

## Testing strategy

Node's built-in test runner (`node --test`), no test dependencies. Coverage:

valid CSV · empty cells · whitespace-only cells · duplicate rows · quoted commas ·
escaped quotes · multiline quoted fields · empty file · header-only file · malformed CSV ·
CRLF vs LF · UTF-8 BOM · missingness percentages · short rows

`examples/sample-dirty.csv` is a small synthetic file with known, hand-counted defects,
asserted end to end so the shipped example stays correct.

Manual verification, recorded with actual results: responsive layout at mobile and
desktop widths, keyboard navigation, a clean browser console, and a Network panel showing
no upload.

## Privacy guarantees

The file is read with the browser's File API and parsed in memory. There is no backend,
no fetch or XHR of file contents, and no external script or stylesheet. The page is static
and works offline once loaded. This is verifiable by reading the source and by watching
the Network panel while analyzing a file.

## Future enhancements

Beyond the MVP, in rough priority order: export a report as Markdown or JSON; per-column
type inference; constant and near-constant column detection; streaming parse to lift the
5 MB limit.
