[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$OracleSystemPassword,

    [Parameter(Mandatory = $true)]
    [string]$PostgresPassword
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$area1Sql = Join-Path $projectRoot 'sql\area1_create_tables.sql'
$area2Sql = Join-Path $projectRoot 'sql\area2_create_tables.sql'

if (-not (Test-Path $area1Sql)) {
    throw "No se encontró el script de Oracle: $area1Sql"
}
if (-not (Test-Path $area2Sql)) {
    throw "No se encontró el script de PostgreSQL: $area2Sql"
}

Write-Host 'Levantando las bases de datos...'
docker compose -f (Join-Path $projectRoot 'docker-compose.yml') up -d oracle-area1 postgresql-area2

Write-Host 'Esperando a que los contenedores estén listos...'
$oracleReady = $false
for ($attempt = 1; $attempt -le 60; $attempt++) {
    $probe = "whenever sqlerror exit 1`nselect 1 from dual;`nexit;"
    $probe | docker exec -i oracle-area1 sqlplus -L -s "system/$OracleSystemPassword@//localhost:1521/FREEPDB1" *> $null
    if ($LASTEXITCODE -eq 0) {
        $oracleReady = $true
        break
    }
    Start-Sleep -Seconds 2
}
if (-not $oracleReady) {
    throw 'Oracle no estuvo disponible después de 120 segundos. Revise: docker logs oracle-area1'
}

$postgresReady = $false
for ($attempt = 1; $attempt -le 60; $attempt++) {
    docker exec postgresql-area2 pg_isready -U area2_user -d db_area2 *> $null
    if ($LASTEXITCODE -eq 0) {
        $postgresReady = $true
        break
    }
    Start-Sleep -Seconds 2
}
if (-not $postgresReady) {
    throw 'PostgreSQL no estuvo disponible después de 120 segundos. Revise: docker logs postgresql-area2'
}

Write-Host 'Creando usuario, tabla e índice de Área 1 en Oracle...'
docker cp $area1Sql 'oracle-area1:/tmp/area1_create_tables.sql'
if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo copiar el script de Área 1 al contenedor Oracle.'
}
docker exec oracle-area1 bash -c "printf 'set sqlblanklines on\nwhenever sqlerror exit sql.sqlcode\n@/tmp/area1_create_tables.sql\nexit;\n' | sqlplus -L -s system/$OracleSystemPassword@//localhost:1521/FREEPDB1"
if ($LASTEXITCODE -ne 0) {
    throw 'Falló la creación de la tabla de Área 1 en Oracle.'
}

Write-Host 'Creando esquema, tabla e índices de Área 2 en PostgreSQL...'
$env:PGPASSWORD = $PostgresPassword
docker cp $area2Sql 'postgresql-area2:/tmp/area2_create_tables.sql'
if ($LASTEXITCODE -ne 0) {
    Remove-Item Env:\PGPASSWORD
    throw 'No se pudo copiar el script de Área 2 al contenedor PostgreSQL.'
}
docker exec postgresql-area2 psql -v ON_ERROR_STOP=1 -U area2_user -d db_area2 -f /tmp/area2_create_tables.sql
if ($LASTEXITCODE -ne 0) {
    Remove-Item Env:\PGPASSWORD
    throw 'Falló la creación de la tabla de Área 2 en PostgreSQL.'
}
Remove-Item Env:\PGPASSWORD

Write-Host 'Verificando tablas e índices...'
docker exec postgresql-area2 psql -U area2_user -d db_area2 -c '\dt area2.*'
docker exec postgresql-area2 psql -U area2_user -d db_area2 -c '\di area2.*'

Write-Host 'Estructuras creadas correctamente. Ya se puede ejecutar la ingesta.'
