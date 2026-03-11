# Run Stripe webhook forwarding and show the signing secret.
# Copy the "whsec_..." value into .env as STRIPE_WEBHOOK_SECRET=whsec_...
$stripePath = "$env:LOCALAPPDATA\Microsoft\WinGet\Links"
if (Test-Path "$stripePath\stripe.exe") {
  $env:Path += ";$stripePath"
}
Write-Host "Starting stripe listen. Copy the webhook signing secret (whsec_...) into .env as STRIPE_WEBHOOK_SECRET=" -ForegroundColor Cyan
Write-Host ""
& stripe listen --forward-to localhost:3001/api/payments/webhook
