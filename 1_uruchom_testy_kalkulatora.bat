@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === TEST KALKULATORA ===
node --experimental-strip-types test/testy.ts
echo.
pause
