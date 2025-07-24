@echo off
echo =====================================
echo FisioFlow Mobile - Setup Inicial
echo =====================================
echo.

echo Verificando se Node.js esta instalado...
node --version
if errorlevel 1 (
    echo Node.js nao encontrado! Instale em: https://nodejs.org
    pause
    exit /b 1
)

echo.
echo Verificando se npm esta disponivel...
npm --version
if errorlevel 1 (
    echo npm nao encontrado!
    pause
    exit /b 1
)

echo.
echo 1. Instalando Expo CLI globalmente...
call npm install -g @expo/cli
if errorlevel 1 (
    echo Erro ao instalar Expo CLI!
    pause
    exit /b 1
)

echo.
echo 2. Instalando EAS CLI globalmente...
call npm install -g eas-cli
if errorlevel 1 (
    echo Erro ao instalar EAS CLI!
    pause
    exit /b 1
)

echo.
echo 3. Instalando dependencias do projeto...
call npm install
if errorlevel 1 (
    echo Erro ao instalar dependencias!
    pause
    exit /b 1
)

echo.
echo 4. Fixando dependencias Expo...
call npx expo install --fix
if errorlevel 1 (
    echo Erro ao fixar dependencias!
    pause
    exit /b 1
)

echo.
echo =====================================
echo SETUP INICIAL CONCLUIDO!
echo =====================================
echo.
echo Proximos passos:
echo 1. Execute: eas login
echo 2. Execute: build-and-deploy.bat
echo.
pause