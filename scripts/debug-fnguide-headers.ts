import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

const code = '161580'; // 필옵틱스

async function debugFnGuideHeaders() {
    console.log(`🔍 Debugging FnGuide Headers for ${code}\n`);

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

        // Find tables with year headers
        console.log('Looking for tables with year headers...\n');

        let tableCount = 0;
        $('table').each((i, el) => {
            const headers = $(el).find('thead tr').last().find('th');
            const hasYears = headers.toArray().some(th => /\d{4}\/\d{2}/.test($(th).text()));

            if (hasYears) {
                tableCount++;
                console.log(`\n${'='.repeat(80)}`);
                console.log(`Table #${tableCount}:\n`);

                // Print all headers
                console.log('Headers:');
                headers.each((j, th) => {
                    const text = $(th).text().trim();
                    console.log(`  [${j}] "${text}"`);
                });

                // Check if this table has financial data
                const text = $(el).text();
                if (text.includes('매출액')) {
                    console.log('\n✅ This table contains 매출액');

                    // Print revenue row
                    console.log('\n매출액 Row:');
                    $(el).find('tbody tr').each((k, tr) => {
                        const title = $(tr).find('th').first().text().trim();
                        if (title.includes('매출액')) {
                            console.log(`  Title: "${title}"`);
                            $(tr).find('td').each((m, td) => {
                                const value = $(td).text().trim();
                                console.log(`    [${m}] ${value}`);
                            });
                        }
                    });
                }
            }
        });

        console.log(`\n${'='.repeat(80)}`);
        console.log(`\nTotal tables with year headers: ${tableCount}`);

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

debugFnGuideHeaders();
