@echo off
echo 🔄 Updating Git Remote URL after Repository Rename...
echo.

echo Current remote URL:
git remote -v
echo.

echo Updating remote URL to new repository name...
git remote set-url origin https://github.com/skrmmagetan-eng/absensi-app-4.0.git
echo.

echo New remote URL:
git remote -v
echo.

echo ✅ Remote URL updated successfully!
echo Now you can continue using git push/pull as usual.
pause