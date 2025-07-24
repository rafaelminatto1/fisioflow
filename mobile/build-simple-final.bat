@echo off
echo =====================================
echo FisioFlow Mobile - Build Simples Final
echo =====================================
echo.

echo Verificando login EAS...
call eas whoami
if errorlevel 1 (
    echo ERRO: Faca login primeiro!
    echo Execute: eas login
    pause
    exit /b 1
)

echo.
echo Testando config do projeto...
call npx expo config --type=public
if errorlevel 1 (
    echo Aviso: Problemas na config, mas continuando...
)

echo.
echo INICIANDO BUILD...
echo Este processo demora 10-15 minutos.
echo NAO FECHE ESTA JANELA!
echo.
call eas build --platform ios --profile preview --clear-cache --non-interactive
if errorlevel 1 (
    echo.
    echo ERRO NO BUILD!
    echo.
    echo Causas comuns:
    echo 1. Bundle ID ja existe - use: com.fisioflow.mobile.uniqueID
    echo 2. Problemas na conta Apple Developer
    echo 3. Erro de rede/conectividade
    echo.
    echo Tente mudar o Bundle ID no app.json e tente novamente.
    pause
    exit /b 1
)

echo.
echo =====================================
echo BUILD CONCLUIDO!
echo =====================================
echo.
echo Agora execute: submit-simple-final.bat
echo.
pause