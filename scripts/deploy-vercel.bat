@echo off
REM Deploy Script para Vercel - FisioFlow

echo.
echo ====================================
echo 🚀 Deploy FisioFlow para Vercel
echo ====================================
echo.

REM Verificar se Vercel CLI está instalado
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI não encontrado
    echo 📦 Instalando Vercel CLI...
    npm install -g vercel
    if %errorlevel% neq 0 (
        echo ❌ Falha ao instalar Vercel CLI
        pause
        exit /b 1
    )
)

echo ✅ Vercel CLI encontrado

REM Verificar build
echo.
echo 🔨 Verificando build de produção...
if not exist "dist" (
    echo 📦 Pasta dist não encontrada, executando build...
    npm run build
    if %errorlevel% neq 0 (
        echo ❌ Falha no build
        pause
        exit /b 1
    )
) else (
    echo ✅ Build encontrado em dist/
)

REM Análise do bundle
echo.
echo 📊 Executando análise do bundle...
node scripts/bundle-analysis.js

REM Deploy para produção
echo.
echo 🌐 Iniciando deploy para Vercel...
echo.
echo ⚠️  IMPORTANTE:
echo - Configure as variáveis de ambiente no painel do Vercel
echo - VITE_GEMINI_API_KEY (opcional, para IA)
echo - Outras variáveis conforme necessário
echo.

set /p continue="Continuar com o deploy? (y/N): "
if /i not "%continue%"=="y" (
    echo Deploy cancelado
    pause
    exit /b 0
)

REM Deploy
vercel --prod
if %errorlevel% neq 0 (
    echo ❌ Falha no deploy
    pause
    exit /b 1
)

echo.
echo ✅ Deploy concluído com sucesso!
echo.
echo 📋 Próximos passos:
echo 1. Verificar se o site está funcionando
echo 2. Configurar domínio customizado (se necessário)
echo 3. Configurar monitoramento
echo 4. Testar funcionalidades principais
echo.

pause