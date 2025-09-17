-- JSON Views backing the Service API

-- Deals JSON view
-- Deals JSON view
CREATE OR REPLACE VIEW api_deals_json AS
SELECT
  jsonb_build_object(
    'id', d.id,
    'post_id', d.post_id,
    'url', d.url,
    'source_posted_at', d.source_posted_at,
    'model', d.model,
    'capacity', d.capacity,
    'carrier', d.carrier,
    'move_type', d.move_type,
    'contract', d.contract,
    'contract_type', d.contract_type,
    'contract_months', d.contract_months,
    'contract_extra_support', d.contract_extra_support,
    'payment', d.payment,
    'channel', d.channel,
    'city', d.city,
    'upfront', COALESCE(d.upfront,0),
    'plan_high_fee', d.plan_high_fee,
    'plan_high_months', d.plan_high_months,
    'plan_after_fee', d.plan_after_fee,
    'plan_after_months', d.plan_after_months,
    'mvno_tail_fee', d.mvno_tail_fee,
    'mvno_tail_months', d.mvno_tail_months,
    'addons_monthly', d.addons_monthly,
    'addons_months', d.addons_months,
    'addons_detail', COALESCE(d.addons_detail, '[]'::jsonb),
    'addons_count', d.addons_count,
    'device_finance_total', d.device_finance_total,
    'device_finance_months', d.device_finance_months,
    'device_finance_monthly', d.device_finance_monthly,
    'cash_delta', d.cash_delta,
    'store', d.store,
    'advertorial_score', d.advertorial_score,
    'flags', COALESCE(d.flags, '[]'::jsonb),
    'badges', COALESCE(d.badges, '[]'::jsonb),
    'parsed_at', d.parsed_at,
    'tco_total', d.tco_total,
    'tco_monthly_24m', CASE WHEN d.tco_total IS NULL THEN NULL ELSE (d.tco_total + 23) / 24 END,
    'tco_net', d.tco_net,
    'tco_net_monthly_24m', CASE WHEN d.tco_net IS NULL THEN NULL ELSE (d.tco_net + 23) / 24 END,
    'retention_line_months', d.retention_line_months,
    'retention_plan_months', d.retention_plan_months,
    'retention_addons_months', d.retention_addons_months,
    'contract_support_amount', d.contract_support_amount
  ) AS deal
FROM deals d;

-- Daily aggregates JSON view
CREATE OR REPLACE VIEW api_reports_daily_json AS
SELECT jsonb_build_object(
    'model', a.model,
    'capacity', a.capacity, -- may be NULL (용량 미상)
    'ts', a.ts,
    'min', a.min,
    'p25', a.p25,
    'median', a.median,
    'p75', a.p75,
    'max', a.max,
    'avg', a.avg,
    'n', a.n
) AS report
FROM aggregates_daily a;

-- Latest snapshot per (model, capacity)
CREATE OR REPLACE VIEW api_reports_daily_latest_json AS
WITH latest AS (
  SELECT model, capacity, MAX(ts) AS ts
    FROM aggregates_daily
   GROUP BY model, capacity
)
SELECT jsonb_build_object(
    'model', a.model,
    'capacity', a.capacity,
    'ts', a.ts,
    'min', a.min,
    'p25', a.p25,
    'median', a.median,
    'p75', a.p75,
    'max', a.max,
    'avg', a.avg,
    'n', a.n
) AS report
FROM aggregates_daily a
JOIN latest l
  ON a.model = l.model AND a.capacity = l.capacity AND a.ts = l.ts;
