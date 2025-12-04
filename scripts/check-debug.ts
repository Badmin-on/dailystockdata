import axios from 'axios';

async function checkDeployedAPIDebug() {
    try {
        const response = await axios.get('https://dailystockdata.vercel.app/api/stock-comparison?year=2025&debug=true');
        const data = response.data;

        console.log('Debug 정보:');
        console.log(JSON.stringify(data, null, 2));
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

checkDeployedAPIDebug();
