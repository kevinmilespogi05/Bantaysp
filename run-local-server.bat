@echo off
REM Run local registration server on Windows

echo 🚀 Starting local registration server...
echo ⏳ Make sure SUPABASE_SERVICE_ROLE_KEY and BREVO_API_KEY are in your .env
echo.

REM Load .env.local if it exists
if exist .env.local (
  echo 📄 Loading .env.local...
  for /f "delims=" %%i in (.env.local) do set "%%i"
)

REM Run with ts-node
npx ts-node local-server.ts
