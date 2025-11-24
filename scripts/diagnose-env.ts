
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(__dirname, '../.env.local');
const content = readFileSync(envPath, 'utf-8');

const idx = content.indexOf('postgres');
if (idx !== -1) {
    console.log('Found "postgres" at index:', idx);
    console.log('Context:', content.substring(Math.max(0, idx - 50), Math.min(content.length, idx + 100)));
} else {
    console.log('Not found "postgres"');
}
