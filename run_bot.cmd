@set PATH=%cd%\3rd_party;%PATH%
Title AnimeBot
@echo off
@taskkill /im node.exe /f > nul 2> nul
@echo on
@nodemon start
pause
