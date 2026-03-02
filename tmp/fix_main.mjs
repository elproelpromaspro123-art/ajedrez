import { readFileSync, writeFileSync } from 'fs';

const file = 'src/public/pages/report/scripts/main.js';
const lines = readFileSync(file, 'utf8').split('\n');

// Remove lines 8655-8697 (0-indexed: 8654-8696) - the broken duplicate bindCoachReviewEvents with old templates
const before = lines.slice(0, 8654);
const after = lines.slice(8698);
const result = before.concat(after);

writeFileSync(file, result.join('\n'), 'utf8');
console.log(`Removed ${8698 - 8654} lines. File now has ${result.length} lines.`);
