const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs-extra');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.timeout = 1200000;  // 20분으로 타임아웃 설정

const fetchTopStocks = async (market) => {
    const stocks = [];
    for (let page = 1; page <= 10; page++) {  // 10페이지까지 조회 (페이지당 50개 기업)
        const url = `https://finance.naver.com/sise/sise_market_sum.nhn?sosok=${market === 'KOSPI' ? 0 : 1}&page=${page}`;
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const decodedResponse = iconv.decode(Buffer.from(response.data), 'EUC-KR');
        const $ = cheerio.load(decodedResponse);
        
        $('table.type_2 tbody tr').each((index, element) => {
            const $tds = $(element).find('td');
            const name = $($tds[1]).text().trim();
            const $anchor = $($tds[1]).find('a');
            if ($anchor.length > 0) {
                const href = $anchor.attr('href');
                if (href) {
                    const code = href.split('=')[1];
                    if (code) {
                        stocks.push({ name, code, market });
                    }
                }
            }
        });
        
        if (stocks.length >= 500) break;  // 500개를 채우면 중단
    }
    
    return stocks.slice(0, 500);  // 정확히 500개만 반환
};

const fetchStockData = async (stockCode) => {
    const url = `https://comp.fnguide.com/SVO2/ASP/SVD_Main.asp?pGB=1&gicode=A${stockCode}`;

    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const table = $('table').eq(11);
        const headers = [];
        table.find('thead th').each((i, elem) => {
            headers.push($(elem).text().trim());
        });

        headers.shift();

        const recentFourYears = headers.slice(-4);
        const rows = table.find('tbody tr');
        const data = {};
        const neededRows = ['매출액', '영업이익'];

        rows.each((i, row) => {
            const cells = $(row).find('td, th');
            let rowName = $(cells[0]).text().trim();
            if (neededRows.includes(rowName)) {
                rowName = rowName.split(' ')[0];
                data[rowName] = cells.slice(-4).map((j, cell) => $(cell).text().trim()).get();
            }
        });

        return { headers: recentFourYears, data };
    } catch (error) {
        console.error(error);
        return { headers: [], data: {} };
    }
};

const generateHtmlForAllCompanies = (allStockData) => {
    let htmlContent = '<h2>주식 정보 (코스피 및 코스닥 상위 1000 종목)</h2>';
    htmlContent += '<style>';
    htmlContent += 'table { border-collapse: collapse; width: 100%; font-size: 12px; }';
    htmlContent += 'th, td { border: 1px solid #ddd; padding: 4px; text-align: right; }';
    htmlContent += 'th { background-color: #f2f2f2; }';
    htmlContent += '.company-name { text-align: left; font-weight: bold; }';
    htmlContent += '.increase { color: red; }';
    htmlContent += '.decrease { color: blue; }';
    htmlContent += 'th, td:nth-child(1) { width: 40px; text-align: center; }';
    htmlContent += 'th, td:nth-child(2) { width: 120px; }';
    htmlContent += 'th, td:nth-child(3) { width: 60px; text-align: center; }';
    htmlContent += 'th, td:nth-child(n+4) { width: 60px; }';
    htmlContent += '</style>';
    htmlContent += '<table><thead><tr><th>번호</th><th>회사명 (종목코드)</th><th>시장</th>';

    if (allStockData.length > 0 && allStockData[0].stockData.headers.length > 0) {
        // 정규표현식을 사용해 'YYYY' 형식의 연도를 정확하게 추출합니다.
        const years = allStockData[0].stockData.headers.map(h => {
            const match = h.match(/\d{4}/); // 문자열에서 네 자리 숫자를 찾음
            return match ? match[0] : null;   // 찾으면 그 숫자를, 못 찾으면 null을 반환
        }).filter(y => y !== null); // 유효한 연도만 필터링
        
        // 매출액 헤더 생성
        years.forEach(year => {
            htmlContent += `<th colspan="2">${year}년 매출액</th>`;
        });
        // 영업이익 헤더 생성
        years.forEach(year => {
            htmlContent += `<th colspan="2">${year}년 영업이익</th>`;
        });

        htmlContent += '</tr><tr><th></th><th></th><th></th>';
        
        // 금액, 증감률 서브헤더 생성 (매출액 + 영업이익)
        years.forEach(() => { htmlContent += '<th>금액</th><th>증감률</th>'; });
        years.forEach(() => { htmlContent += '<th>금액</th><th>증감률</th>'; });
    }

    htmlContent += '</tr></thead><tbody>';

    allStockData.forEach(({ name, code, stockData, market, index }) => {
        htmlContent += `<tr><td>${index}</td><td class="company-name">${name} (${code})</td><td>${market}</td>`;
        
        // 매출액 데이터 출력
        stockData.headers.forEach((_, yearIndex) => {
            const value = stockData.data['매출액'] ? stockData.data['매출액'][yearIndex] : '';
            const prevValue = stockData.data['매출액'] && yearIndex > 0 ? stockData.data['매출액'][yearIndex - 1] : '';
            
            const increaseRate = calculateGrowth(value, prevValue);
            const formattedValue = value ? parseInt(String(value).replace(/,/g, '')).toLocaleString() : '';
            const rateClass = parseFloat(increaseRate) > 0 ? 'increase' : (parseFloat(increaseRate) < 0 ? 'decrease' : '');
            
            htmlContent += `<td>${formattedValue}</td>`;
            htmlContent += `<td class="${rateClass}">${increaseRate ? `${increaseRate}%` : ''}</td>`;
        });

        // 영업이익 데이터 출력
        stockData.headers.forEach((_, yearIndex) => {
            const value = stockData.data['영업이익'] ? stockData.data['영업이익'][yearIndex] : '';
            const prevValue = stockData.data['영업이익'] && yearIndex > 0 ? stockData.data['영업이익'][yearIndex - 1] : '';
            
            const increaseRate = calculateGrowth(value, prevValue);
            const formattedValue = value ? parseInt(String(value).replace(/,/g, '')).toLocaleString() : '';
            const rateClass = parseFloat(increaseRate) > 0 ? 'increase' : (parseFloat(increaseRate) < 0 ? 'decrease' : '');
            
            htmlContent += `<td>${formattedValue}</td>`;
            htmlContent += `<td class="${rateClass}">${increaseRate ? `${increaseRate}%` : ''}</td>`;
        });

        htmlContent += '</tr>';
    });

    htmlContent += '</tbody></table>';

    return htmlContent;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('A user connected');
});

app.get('/stocks', async (req, res) => {
    try {
        const kospiStocks = await fetchTopStocks('KOSPI');
        const kosdaqStocks = await fetchTopStocks('KOSDAQ');
        const allStocks = [...kospiStocks, ...kosdaqStocks];

        let allStockData = [];
        for (let index = 0; index < allStocks.length; index++) {
            const { name, code, market } = allStocks[index];
            try {
                const stockData = await fetchStockData(code);
                allStockData.push({ name, code, stockData, market, index: index + 1 });
                await delay(1000);  // 1초 지연
                
                io.emit('progress', { current: index + 1, total: allStocks.length });
            } catch (error) {
                console.error(`Error fetching data for ${name} (${code}):`, error.message);
            }
        }

        const htmlContent = generateHtmlForAllCompanies(allStockData);
        
        // Excel 파일 생성 및 저장을 먼저 수행
        await saveToExcel(allStockData);
        
        // 작업 완료 후 HTML 컨텐츠 응답
        res.send(htmlContent);

    } catch (error) {
        console.error('Error fetching stock data:', error);
        res.status(500).send(`Error fetching stock data: ${error.message}`);
    }
});

const saveToExcel = async (allStockData) => {
    if (allStockData.length === 0) {
        console.log("No data to save to Excel.");
        return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheetData = [];

    // --- 헤더 생성 ---
    const headers = ['번호', '회사명', '종목코드', '시장'];
    
    // 정규표현식을 사용해 'YYYY' 형식의 연도를 정확하게 추출합니다.
    const years = allStockData[0].stockData.headers.map(h => {
        const match = h.match(/\d{4}/);
        return match ? match[0] : null;
    }).filter(y => y !== null);

    // 엑셀 헤더 생성 로직도 HTML과 통일성을 위해 수정
    years.forEach(year => { headers.push(`${year}년 매출액`); });
    years.forEach(year => { headers.push(`${year}년 매출액 증감률`); });
    years.forEach(year => { headers.push(`${year}년 영업이익`); });
    years.forEach(year => { headers.push(`${year}년 영업이익 증감률`); });
    worksheetData.push(headers);

    // --- 데이터 행 생성 ---
    allStockData.forEach((stock, index) => {
        const row = [
            index + 1,
            stock.name,
            stock.code,
            stock.market
        ];

        const revenues = [], revenueGrowths = [], opProfits = [], opProfitGrowths = [];

        stock.stockData.headers.forEach((_, yearIndex) => {
            const revenueStr = stock.stockData.data['매출액'] ? stock.stockData.data['매출액'][yearIndex] : '';
            const prevRevenueStr = stock.stockData.data['매출액'] && yearIndex > 0 ? stock.stockData.data['매출액'][yearIndex - 1] : '';
            const opProfitStr = stock.stockData.data['영업이익'] ? stock.stockData.data['영업이익'][yearIndex] : '';
            const prevOpProfitStr = stock.stockData.data['영업이익'] && yearIndex > 0 ? stock.stockData.data['영업이익'][yearIndex - 1] : '';

            revenues.push(revenueStr ? parseFloat(revenueStr.replace(/,/g, '')) : null);
            revenueGrowths.push(calculateGrowth(revenueStr, prevRevenueStr));
            opProfits.push(opProfitStr ? parseFloat(opProfitStr.replace(/,/g, '')) : null);
            opProfitGrowths.push(calculateGrowth(opProfitStr, prevOpProfitStr));
        });
        
        // 헤더 순서에 맞게 데이터 삽입
        row.push(...revenues, ...revenueGrowths, ...opProfits, ...opProfitGrowths);
        worksheetData.push(row);
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Data');

    // [수정] 한국 시간대 기준으로 오늘 날짜를 정확하게 생성
    const today = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Seoul'
    }).format(new Date());
    const filePath = path.join('C:', 'alexDB', 'results', `stock_${today}.xlsx`);
    
    await fs.ensureDir(path.dirname(filePath));
    XLSX.writeFile(workbook, filePath);
    console.log(`Excel file saved to ${filePath}`);
};

const calculateGrowth = (current, previous) => {
    if (!current || !previous) return '';
    const currentValue = parseFloat(String(current).replace(/,/g, ''));
    const previousValue = parseFloat(String(previous).replace(/,/g, ''));
    if (isNaN(currentValue) || isNaN(previousValue) || previousValue === 0) return '';
    
    const growth = ((currentValue - previousValue) / previousValue * 100).toFixed(2);
    return `${growth}%`;
};

http.listen(port, () => console.log(`App listening at http://localhost:${port}`));