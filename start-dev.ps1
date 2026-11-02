# PSTO — React client (Supabase)
$root = $PSScriptRoot

Write-Host "Starting PSTO on http://127.0.0.1:5173 ..."
Write-Host "Ensure client/.env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see supabase/README.md)."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\client'; npm run dev"
