@echo off
:: Clear the console
cls
setlocal enabledelayedexpansion

:: Define variables
set TEST_COUNT=3
set TEST_TO_RUN=Backend/MaxRPS.js

:: Run the tests in a loop and save summaries
for /L %%i in (1,1,%TEST_COUNT%) do (
    echo Running test %%i of %TEST_COUNT%...
    k6 run %TEST_TO_RUN%
	
	timeout /t 5
)

echo Test results complete

pause
