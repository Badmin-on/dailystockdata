-- Update get_collection_dashboard to use financial_data_extended
CREATE OR REPLACE FUNCTION get_collection_dashboard()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_companies', (SELECT COUNT(*) FROM companies),
    'companies_with_financial_data', (SELECT COUNT(DISTINCT company_id) FROM financial_data_extended),
    'companies_with_prices', (SELECT COUNT(DISTINCT company_id) FROM daily_stock_prices),
    'total_financial_records', (SELECT COUNT(*) FROM financial_data_extended),
    'total_price_records', (SELECT COUNT(*) FROM daily_stock_prices),
    'latest_financial_date', (SELECT MAX(scrape_date) FROM financial_data_extended),
    'latest_price_date', (SELECT MAX(date) FROM daily_stock_prices),
    'companies_with_120d_prices', (
      SELECT COUNT(DISTINCT company_id)
      FROM daily_stock_prices
      WHERE date >= CURRENT_DATE - INTERVAL '120 days'
      GROUP BY company_id
      HAVING COUNT(*) >= 100
    ),
    'market_breakdown', (
      SELECT json_object_agg(market, count)
      FROM (
        SELECT
          COALESCE(market, 'Unknown') as market,
          COUNT(*) as count
        FROM companies
        GROUP BY market
      ) market_counts
    ),
    'collection_progress', json_build_object(
      'financial_coverage', ROUND(
        (SELECT COUNT(DISTINCT company_id)::NUMERIC FROM financial_data_extended) /
        (SELECT COUNT(*)::NUMERIC FROM companies) * 100, 2
      ),
      'price_coverage', ROUND(
        (SELECT COUNT(DISTINCT company_id)::NUMERIC FROM daily_stock_prices) /
        (SELECT COUNT(*)::NUMERIC FROM companies) * 100, 2
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;
