function Set-Environment {
    param (
        [Parameter(Mandatory)][string]$envFilePath
    )

    if (Test-Path $envFilePath) {
        Get-Content $envFilePath | ForEach-Object {
            if ($_ -match "^(.*?)=(.*)$") {
                $key = $matches[1];
                $value = $matches[2]
                #Write-Host "Key: $key, Value: $value"
            
                [System.Environment]::SetEnvironmentVariable($key, $value)
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
        [array]$validationChecks,
        [bool]$runInteractively = $true
    )

    if ((Test-Path $envFilePath) -and $runInteractively) {
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
        Get-Content $envSampleFilePath | ForEach-Object {
            if ($_ -match "^(.*?)=(.*)$") {
                $sampleValues[$matches[1]] = $matches[2]
            }
        }
    }

    $realValues = @{}
    $sampleValues.Keys | Sort-Object | ForEach-Object {
        $key = $_
        $value = $sampleValues.$key

        # If non-interactive run, use the sample value directly
        if (-not $runInteractively) {
            $envValue = [System.Environment]::GetEnvironmentVariable($key)

            if ($envValue) {
                #Write-Host "Setting $key to $envValue, from ENV"
                $realValues.$key = $envValue
            }
            else {
                #Write-Host "Setting $key to $value, from SAMPLE"
                $realValues.$key = $value
            }
        }
        else {
            # Prompt for each variable with defaults from the sample file
            $newValue = Read-Host "Enter the $key (default: $value)"

            if ($newValue) {
                $realValues.$key = $newValue
            } else {
                $realValues.$key = $value
            }
        }
    }
    
    if  ($runInteractively) {
        # Only perform validation checks when running interactively
        foreach ($check in $validationChecks) {
            if (& $check.ErrorCondition) {
                Write-Host $check.Message -ForegroundColor Red

                exit
            }
        }
    }

    $contents = ''
    $realValues.Keys | Sort-Object | ForEach-Object {
        $key = $_
        $value = $realValues.$key
        
        $contents += "$($key)=$($value)`n"
    }

    $contents = $contents.TrimEnd()

    if ($contents) {
        $contents | Out-File -Encoding utf8 $envFilePath

        if (Test-Path $envFilePath) {
            Write-Host "File Created Successfully: $envFilePath" -ForegroundColor Green

            Set-Environment $envFilePath
        } else {
            Write-Host "Error: $envFilePath File Could Not Be Created." -ForegroundColor Red
        }
    } else {
        Write-Host "Warning: No Contents Generated." -ForegroundColor Yellow
    }
}