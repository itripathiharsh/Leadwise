$ErrorActionPreference = "Continue"

$envContent = Get-Content "d:\atlas CRM\.env" -Raw
if ($envContent -match 'DATABASE_URL="postgresql://postgres:([^@]+)@localhost:5432/atlas_crm"') {
    $dbPass = $matches[1]
    if ($dbPass -eq "REPLACE_WITH_YOUR_POSTGRES_PASSWORD" -or [string]::IsNullOrWhiteSpace($dbPass)) {
        Write-Error "Password not configured in .env"
        exit 1
    }

    $env:PGPASSWORD = $dbPass

    Write-Host "[1/5] Querying running PostgreSQL engine for data_directory..."
    $dataDir = & "D:\PostgreSQL\bin\psql.exe" -U postgres -h localhost -p 5432 -t -c "SHOW data_directory;"
    $trimmedDir = $dataDir.Trim()
    Write-Host "Confirmed data_directory: $trimmedDir"

    Write-Host "[2/5] Ensuring database 'atlas_crm' exists..."
    $checkDb = & "D:\PostgreSQL\bin\psql.exe" -U postgres -h localhost -p 5432 -t -c "SELECT 1 FROM pg_database WHERE datname='atlas_crm';"
    if ($checkDb -notmatch "1") {
        Write-Host "Creating database 'atlas_crm'..."
        $createRes = & "D:\PostgreSQL\bin\psql.exe" -U postgres -h localhost -p 5432 -c "CREATE DATABASE atlas_crm;"
        Write-Host "Database 'atlas_crm' created successfully."
    } else {
        Write-Host "Database 'atlas_crm' already exists."
    }

    $env:PGPASSWORD = $null

    Write-Host "[3/5] Running Prisma schema push to atlas_crm..."
    $pushOut = cmd.exe /c "npx prisma db push --accept-data-loss" 2>&1
    $pushClean = ($pushOut -join "`n") -replace ':[^:@/\s]+@', ':****@'
    Write-Host $pushClean

    Write-Host "[4/5] Seeding database with initial users and records..."
    $seedOut = cmd.exe /c "npm run db:seed" 2>&1
    $seedClean = ($seedOut -join "`n") -replace ':[^:@/\s]+@', ':****@'
    Write-Host $seedClean

    Write-Host "[5/5] Verifying live database operations via Prisma..."
    $verifyOut = cmd.exe /c "npx tsx prisma/verify-db.ts" 2>&1
    $verifyClean = ($verifyOut -join "`n") -replace ':[^:@/\s]+@', ':****@'
    Write-Host $verifyClean
} else {
    Write-Error "DATABASE_URL format invalid in .env"
    exit 1
}
