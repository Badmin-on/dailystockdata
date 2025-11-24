
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(__dirname, '../.env.local');

try {
    let content = readFileSync(envPath, 'utf-8');

    // Check if we have the URL without the key
    if (content.match(/^postgres(ql)?:\/\//m)) {
        console.log('Found raw URL, adding DATABASE_URL= prefix...');
        // Replace start of line that has postgres:// or postgresql:// with DATABASE_URL=...
        // We use a regex that matches the start of the line
        content = content.replace(/^(postgres(ql)?:\/\/.*)$/gm, 'DATABASE_URL="$1"');

        writeFileSync(envPath, content, 'utf-8');
        console.log('✅ Fixed .env.local');
    } else {
        console.log('ℹ️ No raw URL found or already fixed.');
    }

} catch (err) {
    console.error('Error:', err);
}
