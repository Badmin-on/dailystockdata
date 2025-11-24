/**
 * Quick API test script
 */

async function testAPI() {
  console.log('Testing /api/consensus/metrics...\n');

  try {
    const response = await fetch('http://localhost:3000/api/consensus/metrics?date=2025-11-19&limit=3');

    console.log('Status:', response.status, response.statusText);

    if (!response.ok) {
      const text = await response.text();
      console.error('Error response:', text);
      return;
    }

    const data = await response.json();
    console.log('\n✅ API Response:');
    console.log('Total records:', data.pagination?.total || 0);
    console.log('Data length:', data.data?.length || 0);

    if (data.data && data.data.length > 0) {
      console.log('\nSample record:');
      const sample = data.data[0];
      console.log('- Company:', sample.company_name);
      console.log('- Code:', sample.company_code);
      console.log('- Date:', sample.snapshot_date);
      console.log('- FVB Score:', sample.fvb_score);
      console.log('- HGS Score:', sample.hgs_score);
      console.log('- RRS Score:', sample.rrs_score);
      console.log('- Quadrant:', sample.quad_position);
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();
