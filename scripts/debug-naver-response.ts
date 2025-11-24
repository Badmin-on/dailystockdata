
/**
 * Debug script to inspect Naver Finance API response
 */
import axios from 'axios';

async function debugNaverApi(code: string) {
    const url = `https://m.stock.naver.com/api/stock/${code}/finance/annual`;
    console.log(`Fetching ${url}...`);

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://m.stock.naver.com/',
                'Accept': 'application/json',
            },
        });

        const data = response.data;

        if (!data.financeInfo) {
            console.log('No financeInfo found');
            return;
        }

        const { trTitleList, rowList } = data.financeInfo;

        console.log('\n=== Available Years (trTitleList) ===');
        trTitleList.forEach((t: any) => {
            console.log(`Key: ${t.key}, Title: ${t.title}, Consensus: ${t.isConsensus}`);
        });

        console.log('\n=== Operating Profit (영업이익) ===');
        const opRow = rowList.find((r: any) => r.title === '영업이익');
        if (opRow) {
            console.log(JSON.stringify(opRow.columns, null, 2));
        } else {
            console.log('Operating Profit row not found');
        }

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

// Samsung Electronics
debugNaverApi('005930');
