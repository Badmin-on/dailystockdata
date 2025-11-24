
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(__dirname, '../.env.local');

try {
    let content = readFileSync(envPath, 'utf-8');

    // Look for :[...]: pattern in the URL
    if (content.match(/:\[([^\]]+)\]@/)) {
        console.log('Found brackets around password, removing them...');
        content = content.replace(/:\[([^\]]+)\]@/g, ':$1@');

        writeFileSync(envPath, content, 'utf-8');
        console.log('✅ Fixed password format in .env.local');
    } else {
        console.log('ℹ️ No brackets found around password.');
    }

} catch (err) {
    console.error('Error:', err);
}
