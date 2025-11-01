/**
 * ETF 데이터 수정 실행 스크립트
 * 1. 등락률 데이터 검증 및 수정
 * 2. 섹터 분류 추가
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function executeSQL(sql, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📌 ${description}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      console.error('❌ Error:', error.message);
      return { success: false, error };
    }

    console.log('✅ Success');
    if (data) {
      console.log('Result:', JSON.stringify(data, null, 2));
    }
    return { success: true, data };
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return { success: false, error: err };
  }
}

async function main() {
  console.log('🚀 ETF 데이터 수정 시작\n');

  // Step 1: 등락률 검증
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: ETF 등락률 데이터 검증');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const verifySQL = `
    WITH etf_companies AS (
      SELECT id FROM companies WHERE is_etf = TRUE
    ),
    recent_prices AS (
      SELECT
        c.name,
        c.code,
        dsp.date,
        dsp.close_price,
        dsp.change_rate as stored_rate,
        LAG(dsp.close_price) OVER (PARTITION BY dsp.company_id ORDER BY dsp.date) as prev_price
      FROM daily_stock_prices dsp
      JOIN companies c ON c.id = dsp.company_id
      INNER JOIN etf_companies ec ON ec.id = dsp.company_id
      WHERE dsp.date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY dsp.date DESC, c.code
      LIMIT 10
    )
    SELECT
      name,
      code,
      date,
      close_price,
      prev_price,
      stored_rate,
      CASE
        WHEN prev_price IS NULL OR prev_price = 0 THEN NULL
        ELSE ROUND(((close_price - prev_price) / prev_price * 100)::NUMERIC, 2)
      END as calculated_rate
    FROM recent_prices;
  `;

  const verifyResult = await executeSQL(verifySQL, 'ETF 등락률 샘플 데이터 확인');

  if (!verifyResult.success) {
    console.error('\n❌ 검증 실패. 스크립트를 종료합니다.');
    return;
  }

  // 사용자 확인
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  위 데이터를 확인하세요:');
  console.log('   - stored_rate: 현재 DB에 저장된 값 (잘못된 값)');
  console.log('   - calculated_rate: 올바르게 계산된 값 (-10% ~ +10% 예상)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('다음 단계는 실제 데이터를 수정합니다.');
  console.log('계속하려면 스크립트를 다시 실행하세요: node scripts/execute-update.js\n');
}

main()
  .then(() => {
    console.log('\n✅ 스크립트 완료');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
