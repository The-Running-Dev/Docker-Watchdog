param(
    [bool]$runInteractively = $true
)

Clear-Host

# Include the environment-functions
. (Join-Path $PSScriptRoot 'environment-functions.ps1')

Build-Environment `
    -envFilePath $(Join-Path (Split-Path -Parent $PSScriptRoot) '.env') `
    -envSampleFilePath $(Join-Path (Split-Path -Parent $PSScriptRoot) '.env.sample') `
    -validationChecks @(
        @{
            Key = 'APIKey'
            Message = 'Error: APIKey Cannot be Empty...'
            ErrorCondition = { -not $($realValues.APIKey) -or $realValues.APIKey -eq 'INSERT_YOUR_API_KEY_HERE' }
        },
        @{
            Key = 'gitHubPackagesToken'
            Message = 'Error: gitHubPackagesToken Cannot be Empty...'
            ErrorCondition = { -not $($realValues.gitHubPackagesToken) -or $realValues.gitHubPackagesToken -eq 'INSERT_YOUR_TOKEN_HERE' }
        }
    ) `
    -runInteractively $runInteractively