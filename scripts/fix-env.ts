
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(__dirname, '../.env.local');

try {
    if (existsSync(envPath)) {
        // Try reading as utf-8
        let content = readFileSync(envPath, 'utf-8');

        // If it looks like binary/garbage, try utf-16le (common in PowerShell created files)
        if (content.includes('\0')) {
            console.log('Detected UTF-16LE or binary, trying to decode...');
            content = readFileSync(envPath, 'utf16le');
        }

        console.log('Current Content Length:', content.length);

        // Find postgres URL
        const pgUrlMatch = content.match(/postgres:\/\/[^\s"']+/);
        if (pgUrlMatch) {
            const pgUrl = pgUrlMatch[0];
            console.log('Found Postgres URL:', pgUrl);

            // Check if it's already assigned to DATABASE_URL
            if (!content.includes(`DATABASE_URL=${pgUrl}`)) {
                console.log('Fixing DATABASE_URL assignment...');
                // Remove existing DATABASE_URL lines if any
                content = content.replace(/^DATABASE_URL=.*$/gm, '');
                // Append correct one
                content += `\nDATABASE_URL=${pgUrl}\n`;
            }
        } else {
            console.log('❌ No Postgres URL found in file.');
        }

        // Clean up multiple newlines
        content = content.replace(/\n\s*\n/g, '\n');

        // Write back as UTF-8
        writeFileSync(envPath, content, { encoding: 'utf-8' });
        console.log('✅ .env.local fixed and saved as UTF-8');

    } else {
        console.log('❌ .env.local not found');
    }
} catch (err) {
    console.error('Error fixing env:', err);
}
