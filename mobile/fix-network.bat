@echo off
echo =====================================
echo FisioFlow Mobile - Corrigir Rede
echo =====================================
echo.

echo Limpando cache npm...
call npm cache clean --force

echo.
echo Configurando registry npm...
call npm config set registry https://registry.npmjs.org/

echo.
echo Configurando timeout...
call npm config set timeout 60000

echo.
echo Removendo node_modules antigo...
if exist node_modules rmdir /s /q node_modules

echo.
echo Removendo package-lock.json antigo...
if exist package-lock.json del package-lock.json

echo.
echo Instalando dependencias com timeout maior...
call npm install --verbose --timeout=300000

echo.
echo Instalando Expo CLI globalmente...
call npm install -g @expo/cli@latest

echo.
echo Instalando EAS CLI globalmente...
call npm install -g eas-cli@latest

echo.
echo =====================================
echo CORRECAO CONCLUIDA!
echo =====================================
echo.
echo Agora execute: build-simple.bat
echo.
pause