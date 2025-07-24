@echo off
echo =====================================
echo FisioFlow Mobile - Corrigir Dependencias
echo =====================================
echo.

echo Removendo arquivos antigos...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
if exist yarn.lock del yarn.lock

echo.
echo Limpando cache npm...
call npm cache clean --force

echo.
echo Instalando com --legacy-peer-deps...
call npm install --legacy-peer-deps --verbose

echo.
echo Verificando instalacao...
call npx expo --version
if errorlevel 1 (
    echo Erro na instalacao do Expo!
    pause
    exit /b 1
)

echo.
echo =====================================
echo DEPENDENCIAS CORRIGIDAS!
echo =====================================
echo.
echo Agora execute:
echo 1. eas login (ou eas register se nao tiver conta)
echo 2. build-final.bat
echo.
pause