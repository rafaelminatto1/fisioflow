# Script para corrigir imports do useData
Write-Host "Corrigindo imports do useData..." -ForegroundColor Yellow

$files = Get-ChildItem -Path . -Name "*.tsx" -Recurse | Where-Object { $_ -notmatch "node_modules" -and $_ -notmatch "\.git" }

foreach ($file in $files) {
    try {
        $content = Get-Content $file -Raw
        if ($content -match "from '.*useData'") {
            $newContent = $content -replace "from '(.*)useData'", "from '`$1useData.minimal'"
            Set-Content -Path $file -Value $newContent -NoNewline
            Write-Host "Corrigido: $file" -ForegroundColor Green
        }
    } catch {
        Write-Host "Erro em: $file" -ForegroundColor Red
    }
}

Write-Host "Correção concluída!" -ForegroundColor Green