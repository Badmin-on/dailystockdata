
import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import * as fs from 'fs';

async function debugNaverFinsum(code: string) {
    const url = `https://finance.naver.com/item/coinfo.naver?code=${code}&target=finsum_more`;
    console.log(`Fetching ${url}...`);

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        const decoded = iconv.decode(Buffer.from(response.data), 'euc-kr');
        const $ = cheerio.load(decoded);

        console.log(`HTML Length: ${decoded.length}`);

        // Check for iframes
        $('iframe').each((i, el) => {
            console.log(`Iframe ${i} src:`, $(el).attr('src'));
        });

        // Also check for scripts that might redirect
        $('script').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.includes('naver')) console.log(`Script ${i} src:`, src);
        });

        fs.writeFileSync('debug_naver.html', decoded);
        console.log('Saved HTML to debug_naver.html');

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

debugNaverFinsum('005930');
