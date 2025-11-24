
import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

async function fetchFnGuideData(code: string) {
    const url = `https://comp.fnguide.com/SVO2/ASP/SVD_Main.asp?pGB=1&gicode=A${code}`;
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 10000
        });
        return iconv.decode(Buffer.from(response.data), 'utf-8');
    } catch (error) {
        console.error(`Error fetching ${code}:`, error);
        return null;
    }
}

function parseFnGuideData(html: string) {
    const $ = cheerio.load(html);
    const results: any[] = [];

    // Extract Current Price
    const priceText = $('#svdMainChartTxt11').text().replace(/,/g, '');
    const currentPrice = priceText ? parseFloat(priceText) : null;
    console.log(`Current Price: ${currentPrice}`);

    // Find the best Financial Highlight table
    let targetTable: any = null;

    $('table').each((i, el) => {
        const headers = $(el).find('thead tr').last().find('th');
        const hasYears = headers.toArray().some(th => /\d{4}\/\d{2}/.test($(th).text()));
        const txt = $(el).text();
        const hasFinancials = txt.includes('매출액') || txt.includes('영업이익');

        if (hasYears && hasFinancials) {
            // Check distinct years (Annual)
            const yearValues = headers.toArray()
                .map(th => $(th).text().match(/(\d{4})\/\d{2}/))
                .filter(m => m)
                .map(m => m![1]);

            const uniqueYears = new Set(yearValues);

            // Must be distinct years (Annual)
            if (yearValues.length === uniqueYears.size && yearValues.length > 0) {
                targetTable = $(el);
                return false;
            }
        }
    });

    if (!targetTable) {
        console.log('No Annual table found');
        return [];
    }

    // Extract Headers (Years)
    const years: { year: number, isEstimate: boolean, index: number }[] = [];
    targetTable.find('thead tr').last().find('th').each((i: number, el: any) => {
        const text = $(el).text().trim();
        const yearMatch = text.match(/(\d{4})\/\d{2}/);
        if (yearMatch) {
            years.push({
                year: parseInt(yearMatch[1]),
                isEstimate: text.includes('(E)') || text.includes('컨센서스') || text.includes('추정치'),
                index: i
            });
        }
    });
    console.log('Years found:', years.map(y => y.year));

    // Extract Data Rows
    const rowMap: any = {};
    targetTable.find('tbody tr').each((i: number, el: any) => {
        const title = $(el).find('th').first().text().trim();
        const cells = $(el).find('td');

        let field = '';
        if (title.includes('매출액')) field = 'revenue';
        else if (title.includes('영업이익') && !title.includes('발표기준')) field = 'operating_profit';
        else if (title.includes('당기순이익') && title.includes('지배')) field = 'net_income';
        else if (title.includes('EPS')) field = 'eps';
        else if (title.includes('PER')) field = 'per';
        else if (title.includes('ROE')) field = 'roe';

        if (field && !rowMap[field]) {
            rowMap[field] = cells;
        }
    });

    // Build Records
    years.forEach(y => {
        const record: any = {
            year: y.year,
            is_estimate: y.isEstimate,
            data_source: 'fnguide'
        };

        const getVal = (field: string) => {
            if (!rowMap[field]) return null;
            const cell = rowMap[field][y.index - 1];
            if (!cell) return null;
            const text = $(cell).text().trim().replace(/,/g, '');
            if (!text) return null;
            return parseFloat(text);
        };

        record.revenue = getVal('revenue');
        record.operating_profit = getVal('operating_profit');
        record.net_income = getVal('net_income');
        record.eps = getVal('eps');
        record.per = getVal('per');
        record.roe = getVal('roe');

        // FnGuide units: Revenue/OP/Net = 100 million KRW -> Convert to Won
        if (record.revenue) record.revenue = Math.round(record.revenue * 100_000_000);
        if (record.operating_profit) record.operating_profit = Math.round(record.operating_profit * 100_000_000);
        if (record.net_income) record.net_income = Math.round(record.net_income * 100_000_000);

        // Calculate PER if missing
        if (record.per === null && record.eps && currentPrice) {
            record.per = parseFloat((currentPrice / record.eps).toFixed(2));
        }

        if (record.revenue || record.operating_profit || record.eps) {
            results.push(record);
        }
    });

    return results;
}

async function main() {
    const code = '005930'; // Samsung
    console.log(`Fetching ${code}...`);
    const html = await fetchFnGuideData(code);
    if (html) {
        const records = parseFnGuideData(html);
        console.log('Records:', JSON.stringify(records, null, 2));
    }
}

main();
