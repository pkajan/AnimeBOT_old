::Title AnimeBot
@echo off
@taskkill /im node.exe /f > nul 2> nul
@echo on
@nodemon start
pause
