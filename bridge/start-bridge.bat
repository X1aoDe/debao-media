@echo off
chcp 65001 >nul 2>&1
setlocal
rem ---- 找 node：1) 环境变量  2) DSH 自带  3) 本机安装  4) PATH ----
set "NODE="
if defined DEBAO_NODE if exist "%DEBAO_NODE%" set "NODE=%DEBAO_NODE%"
if not defined NODE if exist "%USERPROFILE%\.dsh\tools\nodejs\node.exe" set "NODE=%USERPROFILE%\.dsh\tools\nodejs\node.exe"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE (
  for /f "delims=" %%i in ('where node 2^>nul') do if not defined NODE set "NODE=%%i"
)
if not defined NODE (
  echo 找不到 node.exe。
  echo 请先安装 Node.js 20+（https://nodejs.org），或把 DSH 自带的 node.exe 路径写进环境变量 DEBAO_NODE。
  pause
  exit /b 1
)
echo 用这个 node：%NODE%
title debao bridge :53210
"%NODE%" "%~dp0server.mjs"
echo.
echo bridge stopped.
pause >nul
