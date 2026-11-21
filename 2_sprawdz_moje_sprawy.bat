@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === SPRAWDZANIE TWOICH SPRAW ZUS (folder moje_sprawy) ===
node --experimental-strip-types scripts/sprawdz_sprawy.ts
echo.
pause
