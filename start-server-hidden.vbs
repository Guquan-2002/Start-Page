If Not WScript.Arguments.Named.Exists("elevate") Then
  CreateObject("Shell.Application").ShellExecute WScript.FullName, """" & WScript.ScriptFullName & """ /elevate", "", "runas", 0
  WScript.Quit
End If

Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d ""d:\OneDrive\Workspace\home"" && python -m http.server 7120", 0, False
Set WshShell = Nothing
