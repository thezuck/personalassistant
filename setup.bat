@echo off
echo Setting up project structure...

:: Create directories
mkdir public 2>nul
mkdir src 2>nul
mkdir src\components 2>nul
mkdir src\options 2>nul
mkdir src\services 2>nul
mkdir src\hooks 2>nul
mkdir graphics 2>nul
mkdir icons 2>nul

:: Move HTML files
if exist popup.html (
    echo Moving popup.html to public/index.html
    move /Y popup.html public\index.html
)

:: Handle options.html (keep the one in public if it exists)
if exist options.html (
    if exist public\options.html (
        echo Removing duplicate options.html
        del options.html
    ) else (
        echo Moving options.html to public/
        move /Y options.html public\
    )
)

:: Move JavaScript files
if exist background.js (
    if exist src\components\background.js (
        echo Removing duplicate background.js from components
        del src\components\background.js
    )
    echo Moving background.js to src/
    move /Y background.js src\
)

:: Move popup.js to services
if exist popup.js (
    echo Moving popup.js to calendarService.js
    move /Y popup.js src\services\calendarService.js
)

:: Move promotional images
if exist "Marquee promo tile.png" (
    echo Moving promotional images to graphics/
    move /Y "Marquee promo tile.png" graphics\large.png
)
if exist "Small promo tile.png" (
    move /Y "Small promo tile.png" graphics\small-tile.png
)
if exist "promo screenshot.png" (
    move /Y "promo screenshot.png" graphics\promo-tile.png
)

:: Move icons if they exist
if exist "icon16.png" move /Y icon16.png icons\
if exist "icon48.png" move /Y icon48.png icons\
if exist "icon128.png" move /Y icon128.png icons\

echo Setup complete! Please verify the structure:
dir /s /b

pause 