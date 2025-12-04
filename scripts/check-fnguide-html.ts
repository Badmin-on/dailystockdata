import axios from 'axios';
import * as cheerio from 'cheerio';

const code = '161580'; // 필옵틱스

async function checkFnGuideHTML() {
    console.log(`🔍 Checking FnGuide HTML for ${code}\n`);

    try {
        const url = `https://comp.fnguide.com/SVO2/ASP/SVD_Main.asp?pGB=1&gicode=A${code}`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);

        // Find the table
        let targetTable: any = null;
        $('table').each((i: number, el: any) => {
            const tableText = $(el).text();
            if (tableText.includes('매출액') && tableText.includes('영업이익') && tableText.includes('EPS')) {
                const headers = $(el).find('thead tr').last().find('th');
                if (headers.length >= 3) {
                    targetTable = $(el);
                    return false;
                }
            }
        });

        if (!targetTable) {
            console.log('❌ Table not found');
            return;
        }

        // Extract years from headers
        console.log('📅 Header Years:');
        const years: any[] = [];
        targetTable.find('thead tr').last().find('th').each((i: number, el: any) => {
            const text = $(el).text().trim();
            console.log(`  Column ${i}: "${text}"`);
            const yearMatch = text.match(/(\d{4})\/\d{2}/);
            if (yearMatch) {
                years.push({
                    col: i,
                    year: parseInt(yearMatch[1]),
                    text: text,
                    isEstimate: text.includes('(E)') || text.includes('컨센서스')
                });
            }
        });

        console.log(`\n📊 Parsed Years:`);
        years.forEach(y => {
            console.log(`  Column ${y.col}: ${y.year} - ${y.text} (Estimate: ${y.isEstimate})`);
        });

        // Extract revenue row
        console.log(`\n💰 Revenue Row:`);
        targetTable.find('tbody tr').each((i: number, el: any) => {
            const title = $(el).find('th').first().text().trim();
            if (title.includes('매출액')) {
                console.log(`  Title: "${title}"`);
                $(el).find('td').each((j: number, cell: any) => {
                    const value = $(cell).text().trim();
                    console.log(`    Column ${j}: ${value}`);
                });
            }
        });

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

checkFnGuideHTML();
