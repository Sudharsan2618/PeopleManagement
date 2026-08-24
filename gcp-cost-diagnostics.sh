#!/usr/bin/env bash
# ============================================================================
# gcp-cost-diagnostics.sh
# Diagnose the Cloud Run egress (network data transfer out) cost spike.
#
# Context: project is named "Gemini API", FastAPI backend on Cloud Run
# (asia-south1 / Mumbai), DB on Render (Singapore), WhatsApp Cloud API (Meta).
# Billing shows: "Cloud Run Network Internet Data Transfer Out AsiaPacific to
# AsiaPacific" = 137 GiB / ~Rs 1,575 in Aug 1-23, up ~395% from late July.
#
# IMPORTANT mental model (this is why DB is NOT the culprit):
#   - On Cloud Run, INGRESS (bytes arriving at your service) is FREE.
#   - EGRESS (bytes LEAVING your service to the internet) is BILLED.
#   - A query's result rows coming BACK from an external DB are ingress => free.
#   - So the 137 GiB is bytes your Cloud Run service SENDS out: HTTP responses
#     to browsers/UI (incl. the WhatsApp media proxy) and outbound API calls.
#
# Run:  `gcloud auth login` first, then `bash gcp-cost-diagnostics.sh`
# ============================================================================

set -euo pipefail

# ---- 0. Point at the right project -----------------------------------------
# Replace with your actual project id (the Gemini API project)
PROJECT_ID="$(gcloud config get-value project)"
echo ">> Using project: $PROJECT_ID"

# ---- 1. Find the billing account -------------------------------------------
gcloud billing accounts list

# ---- 2. Confirm Cloud Run is the cost driver, by SKU, this month -----------
# (Works if you have the Cloud Billing API; gives SKU-level breakdown)
BILLING_ACCT="$(gcloud billing accounts list --format='value(name)' | head -n1)"
echo ">> Billing account: $BILLING_ACCT"

# Cost by SKU for the spike window (Aug 1-23, 2026).
# Uses the Billing Catalog / cost CSV — simplest reliable CLI path is the
# BigQuery billing export. If you have NOT enabled it, do step 3 instead.
gcloud billing accounts get-request \
  --account-id="$BILLING_ACCT" 2>/dev/null || true

# ---- 3. (Recommended) Enable BigQuery billing export, then query ----------
# In Cloud Console: Billing > Billing export > BigQuery > ENABLE.
# After a day of data, run these bq queries to pinpoint the egress SKU:
#
# Total egress cost (Cloud Run network out) for the spike window:
bq query --use_legacy_sql=false "
SELECT
  sku.description                                          AS sku,
  ROUND(SUM(cost), 2)                                     AS cost_usd,
  SUM(usage.amount)                                       AS gibibytes
FROM \`$PROJECT_ID.billing_data.gcp_billing_export_resource_v1\`
WHERE DATE(usage_start_time) BETWEEN '2026-08-01' AND '2026-08-23'
  AND lower(sku.description) LIKE '%cloud run%'
  AND lower(sku.description) LIKE '%data transfer out%'
GROUP BY 1 ORDER BY 2 DESC;
"

# ---- 4. Which Cloud Run SERVICE drives the egress? --------------------------
# Cloud Run request logs include response size. Find the heaviest endpoints.
# (Replace SERVICE with your Cloud Run service name, e.g. backend / api)
SERVICE="backend"
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE AND httpRequest.status>=200" \
  --freshness=23d \
  --format='value(httpRequest.requestUrl, httpRequest.responseSize)' \
  > /tmp/run_requests.tsv

# Sum responseSize per URL path (strip query strings) to find the fat endpoint:
echo ">> Top endpoints by total bytes served (egress):"
awk -F'\t' '{n=split($1,a,"?"); p=a[1]; gsub(/\/[0-9]+/,"/:id",p); sz[$1]+=$2; c[$1]++}
           END {for (k in sz) printf "%12.0f bytes  %6d reqs  %s\n", sz[k], c[k], k}' \
  /tmp/run_requests.tsv | sort -rn | head -20

# The single biggest suspect in THIS codebase is the WhatsApp inbound-media
# proxy: GET /whatsapp/media/{media_id}  (serves voice notes / images / video
# downloaded from Meta out to the browser). Filter for it explicitly:
echo ">> Media-proxy egress estimate (bytes served by /whatsapp/media/*):"
grep -E '/whatsapp/media/' /tmp/run_requests.tsv \
  | awk -F'\t' '{tot+=$2; c++} END {printf "requests=%d  total_bytes=%.0f  ~%.1f GiB\n", c, tot, tot/1024/1024/1024}'

# ---- 5. How much traffic goes to the UI vs Meta? ---------------------------
# Outbound connections your service INITIATES are also egress. Check outbound
# calls to graph.facebook.com (Meta) — usually tiny JSON, not the problem.
echo ">> Count of outbound Meta API calls (small, expected):"
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE AND httpRequest.requestUrl=~'graph.facebook.com'" \
  --freshness=23d --format='value(httpRequest.requestUrl)' | wc -l

# ---- 6. Is the service exposed to the public internet / being scraped? -----
# List the Cloud Run URL and check ingress settings.
gcloud run services describe $SERVICE --region=asia-south1 \
  --format='value(status.url, spec.ingress)'

# ---- 7. Quick wins to confirm before/after ---------------------------------
# a) Region check (should be asia-south1 to match "AsiaPacific" egress):
gcloud run services describe $SERVICE --region=asia-south1 --format='value(status.region)'

echo ">> Done. See SUMMARY (chat) for root cause + fixes."
