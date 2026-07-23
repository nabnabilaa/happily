# Trigger the Flowbee auto-recap endpoint locally.
# Usage: powershell -NoProfile -File scripts/report-recap.ps1 -Type weekly
param(
  [ValidateSet('weekly','monthly')] [string]$Type = 'weekly',
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$Secret = $env:CRON_SECRET
)
$url = "$BaseUrl/api/cron/report-recap?type=$Type"
if ($Secret) { $url += "&secret=$Secret" }
Write-Host "Calling $Type recap..."
try {
  $res = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 300
  Write-Host "OK — scopes:" $res.scopes "period:" ($res.period | ConvertTo-Json -Compress)
} catch {
  Write-Error "Recap failed: $($_.Exception.Message)"
  exit 1
}
