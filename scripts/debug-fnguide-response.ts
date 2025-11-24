
/**
 * Debug script to inspect FnGuide response
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

async function debugFnGuide(code: string) {
    const url = `https://comp.fnguide.com/SVO2/ASP/SVD_Main.asp?pGB=1&gicode=A${code}`;
    console.log(`Fetching ${url}...`);

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        const decoded = iconv.decode(Buffer.from(response.data), 'utf-8');
        const $ = cheerio.load(decoded);

        // Check for Price
        const priceText = $('#svdMainChartTxt11').text();

        const headerInfo = $('.corp_group1').text();

        console.log('\n--- FINAL OUTPUT ---');
        console.log('Price ID (svdMainChartTxt11):', priceText);
        console.log('Header Info:', headerInfo.substring(0, 100).replace(/\s+/g, ' '));

        // Try to find price by class if ID fails
        const priceClass = $('.stxt.stxt1').text();
        console.log('Price Class (.stxt.stxt1):', priceClass);

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

// Samsung Electronics
debugFnGuide('005930');
