@echo off
"C:\Users\Administrator\.workbuddy\binaries\node\versions\22.22.2-3\node.exe" "D:\dev\pro_orangemodel\html\dataanlye\verify-dashboards.mjs" > "D:\dev\pro_orangemodel\html\dataanlye\verify-stdout.txt" 2> "D:\dev\pro_orangemodel\html\dataanlye\verify-stderr.txt"
echo EXIT=%ERRORLEVEL% > "D:\dev\pro_orangemodel\html\dataanlye\verify-exit.txt"
