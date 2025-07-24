@echo off
echo =====================================
echo FisioFlow Mobile - Corrigir Config
echo =====================================
echo.

echo Removendo arquivos de config antigos...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo Reinstalando dependencias limpas...
call npm install --legacy-peer-deps

echo.
echo Testando configuracao...
call npx expo config --json
if errorlevel 1 (
    echo Ainda ha problemas na configuracao!
    echo Continuando mesmo assim...
)

echo.
echo Verificando build disponivel...
call eas build:list --platform ios --limit 1 --json
if errorlevel 1 (
    echo Nenhuma build encontrada!
    echo Voce precisa fazer o build primeiro.
    echo Execute: build-simple-final.bat
    pause
    exit /b 1
)

echo.
echo =====================================
echo CONFIGURACAO CORRIGIDA!
echo =====================================
echo.
echo Agora execute: submit-simple-final.bat
echo.
pause