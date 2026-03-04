@echo off
echo Building ProxiFyre Configuration Editor...

REM Install dependencies
echo Installing Go dependencies...
go mod tidy

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

REM Build frontend
echo Building frontend...
cd frontend
call npm run build
cd ..

REM Build application
echo Building application...
wails build -platform windows/amd64

echo Build completed!
echo Executable: ProxiFyreConfigEditor.exe
pause
