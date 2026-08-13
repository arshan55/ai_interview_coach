const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const loadOptionalDotenv = (envPath) => {
  try {
    require('dotenv').config({ path: envPath });
  } catch (error) {
    // dotenv is optional in this workspace; scripts can still run from process.env.
  }
};

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/https?:\/\/[^\s]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const splitCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
};

const parseCsv = (content) => {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {});
  });
};

const stableQuestionId = ({ company, title, link }) => {
  const hash = crypto.createHash('sha1');
  hash.update(normalizeText(company));
  hash.update('|');
  hash.update(normalizeText(title));
  hash.update('|');
  hash.update(normalizeText(link));
  return hash.digest('hex');
};

const parseTopics = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const toFloatOrNull = (value) => {
  const parsed = parseFloat(String(value || '').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const collectCsvFiles = (rootDir) => {
  const results = [];

  const walk = (currentDir) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.csv')) {
        results.push(absolutePath);
      }
    }
  };

  walk(rootDir);
  return results;
};

module.exports = {
  loadOptionalDotenv,
  normalizeText,
  splitCsvLine,
  parseCsv,
  stableQuestionId,
  parseTopics,
  toFloatOrNull,
  collectCsvFiles,
};