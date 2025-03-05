Clear-Host

$envFilePath = Join-Path (Split-Path -Parent $PSScriptRoot) '.env.build'
$envSampleFilePath = Join-Path (Split-Path -Parent $PSScriptRoot) '.env.build.sample'

# Define the array of objects for validation
$validationChecks = @(
    @{
        Key = 'gitHubPackagesToken'
        Message = 'Error: gitHubPackagesToken Cannot be Empty...'
        ErrorCondition = { -not $($realValues.gitHubPackagesToken) -or $realValues.gitHubPackagesToken -eq 'INSERT_YOUR_TOKEN_HERE' }
    }
)

# Include the build-environment function
. (Join-Path $PSScriptRoot 'build-environment.ps1')
$contents = Build-Environment `
    -envFilePath $envFilePath `
    -envSampleFilePath $envSampleFilePath `
    -validationChecks $validationChecks

if ($contents) {
    $contents.TrimEnd() | Out-File -Encoding utf8 $envFilePath

    if (Test-Path $envFilePath) {
        Write-Host "File Created Successfully: $envFilePath" -ForegroundColor Green
    } else {
        Write-Host "Error: $envFilePath File Could Not Be Created." -ForegroundColor Red
    }
} else {
    Write-Host "Warning: No contents were generated." -ForegroundColor Yellow
}