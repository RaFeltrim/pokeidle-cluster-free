Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
mgrPath = currentDir & "\src\cluster_manager.js"

' Executa o supervisor em modo 100% oculto (0 = sem janela, False = nao bloqueia)
WshShell.Run """C:\Program Files\nodejs\node.exe"" """ & mgrPath & """", 0, False
