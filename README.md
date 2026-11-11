# CSV Quality Checker

> Students and data analysts waste time checking CSV datasets manually. The smallest version is a one-page tool that reads a CSV file locally and reports missing values, duplicate rows, and basic dataset statistics.

A privacy-first, browser-based CSV data quality checker. Your file never leaves your
computer: all parsing and analysis happen locally in your browser.

**Status:** Phase 1 — project selected and repository created. MVP in development.

## Problem

Before you can trust an unfamiliar CSV dataset, you need to know the basics: how many
rows are there really, which columns have gaps, and are any rows duplicated? Answering
that today means either writing throwaway pandas code or pasting your data into an
online tool you may not want to trust.

## Target users

Students, data science learners, researchers, and data analysts who need an initial
inspection of an unfamiliar CSV dataset.

## MVP features

1. Select or drag and drop a CSV file.
2. Report total data rows, total columns, missing cells per column (count and
   percentage), and duplicate data rows.
3. Show clear, readable results and errors in a responsive one-page interface.

## Definitions

These rules are fixed so results are reproducible and verifiable:

- The header row is **not** counted as a data row.
- A cell is **missing** if it is empty or contains only whitespace.
- Missingness percentage is calculated against the number of **data rows**.
- A **duplicate** is any repeated data row beyond its first occurrence, compared using
  trimmed cell values, case-sensitively.

## Not in scope

No accounts, no database, no backend, no file uploads to any server, no Excel/XLSX
parsing, no charts, and no machine learning.

## Privacy

CSV processing uses the browser's File API and runs entirely on your machine. No file
contents are transmitted anywhere.

## Course

Boston University DS219 — Software Engineering Career Prep Workshop, Fall 2026.
Final portfolio project.
