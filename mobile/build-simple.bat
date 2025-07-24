@echo off
echo =====================================
echo FisioFlow Mobile - Build Simples
echo =====================================
echo.

echo Verificando instalacao do Expo...
call npx expo --version
if errorlevel 1 (
    echo Erro: Expo nao instalado corretamente!
    echo Execute: npm install -g @expo/cli@latest
    pause
    exit /b 1
)

echo.
echo Verificando login EAS...
call eas whoami
if errorlevel 1 (
    echo Voce precisa fazer login no EAS!
    echo.
    echo Execute este comando primeiro:
    echo eas login
    echo.
    pause
    exit /b 1
)

echo.
echo Inicializando projeto Expo...
call npx expo install --fix

echo.
echo Configurando build EAS...
call eas build:configure

echo.
echo Fazendo build para iOS (TestFlight)...
call eas build --platform ios --profile preview --non-interactive

echo.
echo =====================================
echo BUILD CONCLUIDO!
echo =====================================
echo.
echo Agora execute: submit-simple.bat
echo.
pause