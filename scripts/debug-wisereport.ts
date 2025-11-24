
import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

async function debugWiseReport(code: string) {
    const url = `https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd=${code}`;
    console.log(`Fetching ${url}...`);

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        const decoded = iconv.decode(Buffer.from(response.data), 'utf-8'); // WiseReport is usually UTF-8
        const $ = cheerio.load(decoded);

        console.log(`HTML Length: ${decoded.length}`);
        console.log('Contains "9,760"?', decoded.includes('9,760'));
        console.log('Contains "매출액"?', decoded.includes('매출액'));

        // Find the Financial Summary table
        $('table').each((i, el) => {
            const txt = $(el).text();
            if (txt.includes('매출액') && txt.includes('영업이익')) {
                console.log(`\n=== Potential Table ${i} ===`);

                // Print Headers
                const headers: string[] = [];
                $(el).find('thead tr').each((j, tr) => {
                    $(tr).find('th').each((k, th) => {
                        headers.push($(th).text().trim());
                    });
                });
                console.log('Headers:', headers);

                // Check for 2026/2027 columns
                const has2026 = headers.some(h => h.includes('2026'));
                console.log('Has 2026?', has2026);
            }
        });

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

debugWiseReport('005930');
