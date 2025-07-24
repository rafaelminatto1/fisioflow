@echo off
echo =====================================
echo FisioFlow Mobile - Setup EAS
echo =====================================
echo.

echo Fazendo login no EAS...
call eas login
if errorlevel 1 (
    echo Erro no login!
    echo.
    echo Se nao tem conta, execute: eas register
    pause
    exit /b 1
)

echo.
echo Inicializando projeto EAS...
call eas init
if errorlevel 1 (
    echo Erro no init!
    pause
    exit /b 1
)

echo.
echo =====================================
echo EAS CONFIGURADO!
echo =====================================
echo.
echo Agora execute: build-ultimate.bat
echo.
pause