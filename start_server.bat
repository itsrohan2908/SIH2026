@echo off
setlocal
where python >nul 2>nul
if %errorlevel%==0 (
  echo Starting INDRA at http://localhost:8000
  echo Press Ctrl+C to stop the server.
  python -m http.server 8000
  goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
  echo Starting INDRA at http://localhost:8000
  echo Press Ctrl+C to stop the server.
  py -m http.server 8000
  goto :eof
)
echo Python was not found. Open index.html directly in Chrome or Edge.
pause
