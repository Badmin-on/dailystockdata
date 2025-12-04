import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

const code = '161580'; // 필옵틱스

async function analyzeFnGuideHeaders() {
    console.log(`🔍 Analyzing FnGuide Headers for 필옵틱스 (${code})\n`);

    try {
        const url = `https://comp.fnguide.com/SVO2/ASP/SVD_Main.asp?pGB=1&gicode=A${code}`;
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const html = iconv.decode(Buffer.from(response.data), 'utf-8');
        const $ = cheerio.load(html);

        // Find table with year headers
        $('table').each((tableIdx, table) => {
            const headers = $(table).find('thead tr').last().find('th');
            const hasYears = headers.toArray().some(th => /\d{4}\/\d{2}/.test($(th).text()));

            if (!hasYears) return;

            // Check if has revenue
            const hasRevenue = $(table).text().includes('매출액');
            if (!hasRevenue) return;

            console.log('='.repeat(80));
            console.log(`\nTable with financial data found:\n`);

            // Print all headers with their index
            console.log('Headers:');
            const yearHeaders: any[] = [];
            headers.each((i, th) => {
                const text = $(th).text().trim();
                const yearMatch = text.match(/(\d{4})\/\d{2}/);

                if (yearMatch) {
                    yearHeaders.push({
                        index: i,
                        text: text,
                        year: parseInt(yearMatch[1])
                    });
                }

                console.log(`  [${i}] "${text}"`);
            });

            // Print revenue row with cell indices
            console.log('\n매출액 Row:');
            $(table).find('tbody tr').each((j, tr) => {
                const title = $(tr).find('th').first().text().trim();
                if (title.includes('매출액')) {
                    const cells = $(tr).find('td');
                    cells.each((k, td) => {
                        const value = $(td).text().trim();
                        console.log(`  Cell [${k}]: ${value}`);
                    });
                }
            });

            // Analyze mapping
            console.log('\n📊 Year to Data Mapping:');
            console.log('Current script logic: FnGuide header year + 1 = stored year\n');

            yearHeaders.forEach((h, idx) => {
                const currentLogic = h.year + 1;
                console.log(`Header [${h.index}] "${h.text}"`);
                console.log(`  → Current: Store as year ${currentLogic}`);
                console.log(`  → Cell index to read: ${h.index}`);

                // Get actual cell value
                $(table).find('tbody tr').each((j, tr) => {
                    const title = $(tr).find('th').first().text().trim();
                    if (title.includes('매출액')) {
                        const cells = $(tr).find('td');
                        const cellValue = $(cells[h.index]).text().trim();
                        console.log(`  → Actual value: ${cellValue}`);
                    }
                });
                console.log();
            });

            return false; // Stop after first table
        });

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

analyzeFnGuideHeaders();
