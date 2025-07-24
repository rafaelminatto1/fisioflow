@echo off
echo =====================================
echo FisioFlow Mobile - Build Final Corrigido
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
echo Removendo configuracao problematica...
if exist eas.json del eas.json

echo.
echo Configurando EAS do zero...
call eas build:configure --platform ios --non-interactive
if errorlevel 1 (
    echo Erro na configuracao automatica
    echo Continuando...
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
    echo Tentando com Bundle ID alternativo...
    echo Editando app.json...
    
    powershell -Command "(Get-Content app.json) -replace 'com.fisioflow.mobile', 'com.fisioflow.mobile.%RANDOM%' | Set-Content app.json"
    
    echo Tentando build novamente...
    call eas build --platform ios --profile preview --clear-cache --non-interactive
    
    if errorlevel 1 (
        echo Build falhou novamente!
        pause
        exit /b 1
    )
)

echo.
echo =====================================
echo BUILD CONCLUIDO!
echo =====================================
echo.
echo Agora execute: submit-simple-final.bat
echo.
pause