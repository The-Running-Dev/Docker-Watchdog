function Get-Environment {
    param (
        [Parameter(Mandatory)][string]$envFilePath,
        [Parameter(Mandatory)][string]$envBuildFilePath
    )

    Read-EnvironmentFile $envFilePath
    Read-EnvironmentFile $envBuildFilePath
}

function Read-EnvironmentFile {
    param (
        [Parameter(Mandatory)][string]$envFilePath
    )

    if ([System.IO.File]::Exists($envFilePath)) {
        Get-Content $envFilePath | ForEach-Object {
            if ($_ -match "^(.*?)=(.*)$") {
                Write-Host "Key: $($matches[1]), Value: $($matches[2])"
                Set-Item -Path "env:$($matches[1])" -Value $matches[2]
            
                #[System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
            }
        }
    } else {
        Write-Error "File Not Found: $envFilePath"
    }
}

function Build-Environment {
    param (
        [Parameter(Mandatory)][string]$envFilePath,
        [Parameter(Mandatory)][string]$envSampleFilePath,
        [array]$validationChecks
    )

    $contents = Build-EnvironmentCommon `
        -envFilePath $envFilePath `
        -envSampleFilePath $envSampleFilePath `
        -validationChecks $validationChecks

    if ($contents) {
        $contents | Out-File -Encoding utf8 $envFilePath

        if (Test-Path $envFilePath) {
            Write-Host "File Created Successfully: $envFilePath" -ForegroundColor Green
        } else {
            Write-Host "Error: $envFilePath File Could Not Be Created." -ForegroundColor Red
        }
    } else {
        Write-Host "Warning: No contents were generated." -ForegroundColor Yellow
    }
}

function Build-BuildEnvironment {
    param (
        [Parameter(Mandatory)][string]$envFilePath,
        [Parameter(Mandatory)][string]$envSampleFilePath,
        [array]$validationChecks
    )
    
    $contents = Build-EnvironmentCommon `
        -envFilePath $envFilePath `
        -envSampleFilePath $envSampleFilePath `
        -validationChecks $validationChecks
    
    if ($contents) {
        $contents | Out-File -Encoding utf8 $envFilePath
    
        if (Test-Path $envFilePath) {
            Write-Host "File Created Successfully: $envFilePath" -ForegroundColor Green
        } else {
            Write-Host "Error: $envFilePath File Could Not Be Created." -ForegroundColor Red
        }
    } else {
        Write-Host "Warning: No contents were generated." -ForegroundColor Yellow
    }
}

function Build-EnvironmentCommon {
    param (
        [Parameter(Mandatory)][string]$envFilePath,
        [Parameter(Mandatory)][string]$envSampleFilePath,
        [array]$validationChecks
    )

    if (Test-Path $envFilePath) {
        $overwrite = Read-Host -Prompt "$envFilePath File Exists. Overwrite? (y/N)"

        if ($overwrite -eq '' -or $overwrite -ne 'y') {
            Write-Host "Exiting Without Making Changes..."

            exit
        }

        # Format the date to a compatible string for use as a filename
        $date = Get-Date -Format "yyyy.MM.dd.HH.mm.ss"
        $backupFilePath = "$envFilePath.$date"

        # Copy the original .env file to a backup file with the date appended to the filename
        Copy-Item -Path $envFilePath -Destination $backupFilePath

        if (Test-Path $backupFilePath) {
            Write-Host "Backup of $envFilePath Created Successfully...$backupFilePath" -ForegroundColor Green
        } else {
            Write-Host "Error: Backup of $envFilePath File Could Not Be Created." -ForegroundColor Red
            
            exit
        }
    }

    # Load existing values from $envSampleFilePath if it exists
    $sampleValues = @{}
    if (Test-Path $envSampleFilePath) {
        $sampleValues = Get-Content $envSampleFilePath | ForEach-Object {
            if ($_ -match "^(.*?)=(.*)$") {
                return @{ $matches[1] = $matches[2] }
            }
        }
    }

    $realValues = @{}
    $sampleValues.Keys | Sort-Object | ForEach-Object {
        $key = $_
        $value = $sampleValues.$key

        # Prompt for each variable with defaults from existing .env.build
        $newValue = Read-Host "Enter the $key (default: $value)"

        if ($newValue) {
            $realValues.$key = $newValue
        } else {
            $realValues.$key = $value
        }
    }

    # Perform validation checks
    foreach ($check in $validationChecks) {
        if (& $check.ErrorCondition) {
            Write-Host $check.Message -ForegroundColor Red

            exit
        }
    }

    $contents = ''
    $realValues.Keys | Sort-Object | ForEach-Object {
        $key = $_
        $value = $realValues.$key
        
        $contents += "$($key)=$($value)`n"
    }

    return $contents.TrimEnd()
}