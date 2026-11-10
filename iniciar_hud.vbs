Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
psScript = currentDir & "\src\hud_windows.ps1"

' Executa a HUD Windows via PowerShell STA sem janela preta de console
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -STA -File """ & psScript & """", 0, False
