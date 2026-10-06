@echo off
setlocal
cd /d %~dp0

echo === getPlaced setup ===
echo.

echo Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 goto :error
if not exist .env copy .env.example .env
cd ..

echo Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 goto :error
if not exist .env copy .env.example .env
cd ..

echo.
echo Setup complete.
echo 1. Configure backend\.env with your MongoDB URI and JWT secret.
echo 2. Start backend: cd backend ^&^& npm run dev
echo 3. Start frontend: cd frontend ^&^& npm run dev
exit /b 0

:error
echo.
echo Setup failed. Check the npm output above.
exit /b 1
