$ErrorActionPreference = 'Stop'

$envFile = Join-Path $PSScriptRoot '..\backend\.env'
if (-not (Test-Path $envFile)) {
  throw "No existe backend/.env. Copia backend/.env.example y completa GCP_PROJECT_ID."
}

$projectId = (Get-Content $envFile |
  Where-Object { $_ -match '^GCP_PROJECT_ID=' } |
  Select-Object -First 1) -replace '^GCP_PROJECT_ID=', ''

if ([string]::IsNullOrWhiteSpace($projectId) -or $projectId -eq 'tu-project-id') {
  throw "GCP_PROJECT_ID no está configurado correctamente en backend/.env."
}

Get-ChildItem -Path $PSScriptRoot -Filter '*.sql' |
  Where-Object { $_.Name -ne 'run-sql.ps1' } |
  Sort-Object Name |
  ForEach-Object {
    $query = (Get-Content $_.FullName -Raw).Replace('{{GCP_PROJECT_ID}}', $projectId)
    Write-Host "Ejecutando $($_.Name) en $projectId..."
    bq query --project_id=$projectId --use_legacy_sql=false $query
    if ($LASTEXITCODE -ne 0) {
      throw "Falló la ejecución de $($_.Name)."
    }
  }
