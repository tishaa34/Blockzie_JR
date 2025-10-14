@echo off
title Scratch Web App Launcher
color 0A

echo.
echo  ┌─────────────────────────────────────┐
echo  │   Blockzie_JR Web App Launcher      │
echo  │            One-Click Start          │
echo  └─────────────────────────────────────┘
echo.

echo [1/4] 🐍 Starting Python Detection Server...
cd python-backend
start "Python Server" cmd /k "python detector.py"
cd ..

echo [2/4] ⏳ Waiting for Python server to initialize...
timeout /t 4 /nobreak > nul

echo [3/4] ⚛️  Starting React Development Server...
echo       This will open in your default browser...
echo.

start "React Server" cmd /k "npm start"

echo [4/4] ✅ Both servers started successfully!
echo.
echo ┌─────────────────────────────────────┐
echo │  🐍 Python Server: localhost:5000  │
echo │  ⚛️  React App:     localhost:3000  │
echo └─────────────────────────────────────┘
echo.
echo 💡 Two terminal windows opened:
echo    - Python Server (keep running)
echo    - React Server (keep running)
echo.
echo 🛑 To stop servers: Close both terminal windows
echo    or press Ctrl+C in each window
echo.
pause
