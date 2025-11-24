
import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

async function debugWiseReportEncparam(code: string) {
    const mainUrl = `https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd=${code}`;
    console.log(`Fetching Main URL: ${mainUrl}...`);

    try {
        // 1. Fetch Main Page to get cookies and encparam
        const mainResponse = await axios.get(mainUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        const mainHtml = mainResponse.data;

        // Extract encparam
        // Look for: "encparam: '...'" or var encparam = '...'
        const match = mainHtml.match(/encparam\s*:\s*['"]([^'"]+)['"]/);
        if (!match) {
            console.error('❌ Could not find encparam in main page.');
            // Try finding it in a script tag content if regex failed on full body (sometimes it's messy)
            return;
        }

        const encparam = match[1];
        console.log(`✅ Found encparam: ${encparam}`);

        // 2. Fetch AJAX with encparam
        const ajaxUrl = `https://navercomp.wisereport.co.kr/company/ajax/cF1001.aspx?cmp_cd=${code}&fin_typ=0&freq_typ=Y&encparam=${encparam}&id=`;
        console.log(`Fetching AJAX URL: ${ajaxUrl}...`);

        const ajaxResponse = await axios.get(ajaxUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': mainUrl,
                'Accept': '*/*',
                'X-Requested-With': 'XMLHttpRequest',
                // Pass cookies if needed (axios might not handle them automatically without a jar, but let's try without first)
            },
        });

        const decoded = iconv.decode(Buffer.from(ajaxResponse.data), 'utf-8');
        const $ = cheerio.load(decoded);

        console.log(`HTML Length: ${decoded.length}`);
        console.log('Contains "9,760"?', decoded.includes('9,760'));

        // Print Headers
        const headers: string[] = [];
        $('thead tr').eq(1).find('th').each((i, el) => {
            headers.push($(el).text().trim());
        });
        console.log('Headers:', headers);

        // Print Rows for EPS/PER
        $('tbody tr').each((i, tr) => {
            const title = $(tr).find('th').text().trim();
            if (title.includes('EPS') || title.includes('PER')) {
                const cells: string[] = [];
                $(tr).find('td').each((j, td) => {
                    cells.push($(td).text().trim());
                });
                console.log(`${title}:`, cells);
            }
        });

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

debugWiseReportEncparam('005930');
