import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_PATH = path.resolve(here, '../../../data/traveler-tips.json');

export function readStore() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return {};
  }
}

export function writeStore(data) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  const sorted = Object.fromEntries(Object.keys(data).sort().map((k) => [k, data[k]]));
  fs.writeFileSync(DATA_PATH, JSON.stringify(sorted, null, 2) + '\n');
}
