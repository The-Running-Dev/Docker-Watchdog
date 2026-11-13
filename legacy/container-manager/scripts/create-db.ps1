$serverInstallerId = 'MongoDB.Server'
$shellInstallerId = 'MongoDB.Shell'
$basePath = Split-Path $PSScriptRoot -Parent
$dbPath = Join-Path $basePath 'mongo-data'
$logPath = Join-Path $basePath 'mongo-data\mongod.log'
$dbName = 'dockerWebhooks'
$mongoBinPath = 'C:\Program Files\MongoDB\Server\8.0\bin'
$shellPath = 'C:\Users\Ben\AppData\Local\Programs\mongosh\mongosh.exe'
$mongoHost = 'localhost:27017'

function Test-MongoDBInstalled {
    try {
        & mongo --version > $null 2>&1
        return $true
    } catch {
        return $false
    }
}

function Test-DatabaseCreated {
    param (
        [string]$dbName
    )
    try {
        $dbs = & $shellPath --quiet --host $mongoHost --eval "printjson(db.getMongo().getDBs().databases.map(d => ({ name: d.name, sizeOnDisk: NumberLong(d.sizeOnDisk).toString(), empty: d.empty })))"
        $dbs = $dbs | ConvertFrom-Json
        $dbs

        $db = $dbs | Where-Object name -eq $dbName
        $db

        return $null -ne $db
    } catch {
        return $false
    }
}

if (-not (Test-MongoDBInstalled)) {
    if (-Not (Test-Path -Path $dbPath)) {
        New-Item -ItemType Directory -Path $dbPath -Force | Out-Null
    }

    # Install MongoDB
    Start-Process winget `
        -ArgumentList "install", "--id", $serverInstallerId, "--silent", "--accept-package-agreements", "--accept-source-agreements" `
        -Wait

    # Install MongoDB Shell
    Start-Process winget `
        -ArgumentList "install", "--id", $shellInstallerId, "--silent", "--accept-package-agreements", "--accept-source-agreements" `
        -Wait

    # Start MongoDB
    Start-Process "$mongoBinPath\mongod.exe" `
        -ArgumentList "--dbpath", $dbPath, "--logpath", $logPath, "--bind_ip", "127.0.0.1", "--port", "27017", "--install" `
        -Wait

    Start-Service MongoDB
}

# Hash the password using Node.js before inserting into MongoDB
$hashedPassword = node -e "require('bcryptjs').hash('admin123', 10, (err, hash) => console.log(hash));"
Write-Output "Hashed Password: $hashedPassword"

# Initialize the database with hashed password
if (-not (Test-DatabaseCreated -dbName $dbName)) {
    $mongoShellScript = @"
use $dbName
db.createCollection("users")
db.users.insertOne({ username: "admin", password: "$hashedPassword" })
"@

    # Save script to temp file
    $initDbFile = Join-Path $env:Temp 'init-db.js'
    $mongoShellScript | Out-File -FilePath $initDbFile -Encoding utf8
    Start-Process $shellPath -ArgumentList "--host", $mongoHost, $initDbFile -Wait

    Write-Output "MongoDB Initialization Complete..."

    Remove-Item $initDbFile -Force
}