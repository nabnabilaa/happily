$WshShell = New-Object -comObject WScript.Shell

$ClaudeShortcut = $WshShell.CreateShortcut("$HOME\Desktop\Claude Code (Happily).lnk")
$ClaudeShortcut.TargetPath = "c:\Users\Wahyudi\Documents\GitHub\happily\Run_Claude.bat"
$ClaudeShortcut.WorkingDirectory = "c:\Users\Wahyudi\Documents\GitHub\happily"
$ClaudeShortcut.IconLocation = "cmd.exe"
$ClaudeShortcut.Save()

$AgShortcut = $WshShell.CreateShortcut("$HOME\Desktop\Antigravity IDE (Happily).lnk")
$AgShortcut.TargetPath = "C:\Users\Wahyudi\AppData\Local\Programs\antigravity-ide\Antigravity IDE.exe"
$AgShortcut.Arguments = "c:\Users\Wahyudi\Documents\GitHub\happily"
$AgShortcut.WorkingDirectory = "c:\Users\Wahyudi\Documents\GitHub\happily"
$AgShortcut.Save()

Write-Host "Shortcuts created on Desktop."
