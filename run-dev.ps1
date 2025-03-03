# Check if node_modules directory exists
if (-Not (Test-Path -Path "./node_modules")) {
    Write-Host "node_modules Directory Not Found. Installing Packages..."

    & pnpm install
}

Start-Sleep -Seconds 2

& pnpm run dev