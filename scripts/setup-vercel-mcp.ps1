# 🔧 Script de Configuração Automática - Vercel MCP Server
# Executa: PowerShell -ExecutionPolicy Bypass -File setup-vercel-mcp.ps1

Write-Host "🚀 Configurando Vercel MCP Server para Claude..." -ForegroundColor Green
Write-Host ""

# Verificar Node.js
Write-Host "📋 Verificando pré-requisitos..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
    
    # Verificar se é versão 18+
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNumber -lt 18) {
        Write-Host "⚠️  Aviso: Node.js versão 18+ recomendada. Versão atual: $nodeVersion" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Node.js não encontrado. Instale em: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Solicitar Token Vercel
Write-Host ""
Write-Host "🔑 Configuração do Token Vercel" -ForegroundColor Cyan
Write-Host "1. Acesse: https://vercel.com/account/tokens" -ForegroundColor White
Write-Host "2. Clique em 'Create Token'" -ForegroundColor White
Write-Host "3. Nome: 'Claude MCP Integration'" -ForegroundColor White
Write-Host "4. Scope: 'Full Account'" -ForegroundColor White
Write-Host "5. Copie o token gerado" -ForegroundColor White
Write-Host ""

$vercelToken = Read-Host "Cole seu token Vercel aqui"
if ([string]::IsNullOrWhiteSpace($vercelToken)) {
    Write-Host "❌ Token é obrigatório!" -ForegroundColor Red
    exit 1
}

# Testar token
Write-Host ""
Write-Host "🧪 Testando token..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $vercelToken" }
    $response = Invoke-RestMethod -Uri "https://api.vercel.com/v2/user" -Headers $headers
    Write-Host "✅ Token válido! Usuário: $($response.user.username)" -ForegroundColor Green
} catch {
    Write-Host "❌ Token inválido ou sem permissões!" -ForegroundColor Red
    exit 1
}

# Instalar MCP Server
Write-Host ""
Write-Host "📦 Instalando Vercel MCP Server..." -ForegroundColor Yellow
try {
    npm install -g @nganiet/mcp-vercel
    Write-Host "✅ MCP Server instalado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro na instalação. Tentando instalação local..." -ForegroundColor Yellow
    try {
        npm install @nganiet/mcp-vercel
        Write-Host "✅ MCP Server instalado localmente!" -ForegroundColor Green
        $localInstall = $true
    } catch {
        Write-Host "❌ Falha na instalação!" -ForegroundColor Red
        exit 1
    }
}

# Localizar Claude Desktop config
Write-Host ""
Write-Host "📁 Localizando configuração do Claude Desktop..." -ForegroundColor Yellow

$claudeConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json"
$claudeConfigDir = "$env:APPDATA\Claude"

if (!(Test-Path $claudeConfigDir)) {
    Write-Host "📁 Criando diretório de configuração..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
}

# Preparar configuração MCP
$mcpConfig = @{
    mcpServers = @{
        vercel = @{
            command = "npx"
            args = @("@nganiet/mcp-vercel")
            env = @{
                VERCEL_API_TOKEN = $vercelToken
            }
        }
    }
}

# Se existe config, fazer merge
if (Test-Path $claudeConfigPath) {
    Write-Host "📝 Atualizando configuração existente..." -ForegroundColor Yellow
    try {
        $existingConfig = Get-Content $claudeConfigPath -Raw | ConvertFrom-Json
        if (!$existingConfig.mcpServers) {
            $existingConfig | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value @{}
        }
        $existingConfig.mcpServers.vercel = $mcpConfig.mcpServers.vercel
        $mcpConfig = $existingConfig
    } catch {
        Write-Host "⚠️  Erro ao ler config existente. Criando nova..." -ForegroundColor Yellow
    }
} else {
    Write-Host "📝 Criando nova configuração..." -ForegroundColor Yellow
}

# Salvar configuração
try {
    $mcpConfig | ConvertTo-Json -Depth 10 | Set-Content $claudeConfigPath -Encoding UTF8
    Write-Host "✅ Configuração salva em: $claudeConfigPath" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao salvar configuração!" -ForegroundColor Red
    exit 1
}

# Verificar se Claude Desktop está rodando
Write-Host ""
Write-Host "🔄 Verificando Claude Desktop..." -ForegroundColor Yellow
$claudeProcess = Get-Process -Name "Claude" -ErrorAction SilentlyContinue
if ($claudeProcess) {
    Write-Host "⚠️  Claude Desktop está rodando. Será necessário reiniciar!" -ForegroundColor Yellow
    $restart = Read-Host "Deseja fechar e reabrir o Claude Desktop agora? (s/n)"
    if ($restart -eq 's' -or $restart -eq 'S') {
        Write-Host "🔄 Fechando Claude Desktop..." -ForegroundColor Yellow
        Stop-Process -Name "Claude" -Force
        Start-Sleep -Seconds 2
        
        # Tentar reabrir Claude Desktop
        $claudePath = Get-ChildItem -Path "$env:LOCALAPPDATA\Programs\Claude" -Name "Claude.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($claudePath) {
            Write-Host "🚀 Reabrindo Claude Desktop..." -ForegroundColor Green
            Start-Process "$env:LOCALAPPDATA\Programs\Claude\$claudePath"
        } else {
            Write-Host "📱 Por favor, abra o Claude Desktop manualmente" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "📱 Claude Desktop não está rodando. Abra-o para testar!" -ForegroundColor Yellow
}

# Instruções finais
Write-Host ""
Write-Host "🎉 Configuração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Abra o Claude Desktop" -ForegroundColor White
Write-Host "2. Procure pelo ícone de slider (🎛️) no canto inferior esquerdo" -ForegroundColor White
Write-Host "3. Teste com: 'Liste meus projetos Vercel'" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Ferramentas disponíveis:" -ForegroundColor Cyan
Write-Host "• vercel-list-all-deployments - Listar deployments" -ForegroundColor White
Write-Host "• vercel-get-deployment-logs - Ver logs de deploy" -ForegroundColor White
Write-Host "• vercel-get-deployment-status - Status de deployment" -ForegroundColor White
Write-Host "• vercel-list-projects - Listar projetos" -ForegroundColor White
Write-Host ""
Write-Host "📖 Documentação completa: VERCEL-MCP-SETUP.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "✨ Happy coding!" -ForegroundColor Green

# Criar arquivo de teste
$testCommands = @"
# 🧪 Comandos de Teste - Vercel MCP

## Teste Básico
Liste meus projetos Vercel usando vercel-list-projects

## Verificar FisioFlow
Mostre o status do último deployment do projeto fisioflow

## Ver Logs
Mostre os logs do último deployment que falhou

## Monitoramento
Liste os últimos 5 deployments com seus status

## Variáveis de Ambiente
Liste as variáveis de ambiente do projeto fisioflow em produção

## Performance
Analise os tempos de build dos últimos 10 deployments
"@

$testCommands | Set-Content "$PSScriptRoot\vercel-mcp-test-commands.md" -Encoding UTF8
Write-Host "📝 Comandos de teste salvos em: vercel-mcp-test-commands.md" -ForegroundColor Green