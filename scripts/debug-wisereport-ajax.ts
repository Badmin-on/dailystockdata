
import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

async function debugWiseReportAjax(code: string) {
    // URL found in WiseReport network traffic (common knowledge for this site)
    // cF1001.aspx is "Financial Highlight"
    const url = `https://navercomp.wisereport.co.kr/company/ajax/cF1001.aspx?cmp_cd=${code}&fin_typ=0&freq_typ=Y&encparam=&id=`;
    console.log(`Fetching ${url}...`);

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': `https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd=${code}`,
                'Accept': '*/*',
                'X-Requested-With': 'XMLHttpRequest'
            },
        });

        console.log('Response Status:', response.status);
        console.log('Response Headers:', response.headers);

        const decoded = iconv.decode(Buffer.from(response.data), 'utf-8');
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

debugWiseReportAjax('005930');
