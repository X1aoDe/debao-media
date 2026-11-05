' Start the debao media capture bridge without a console window.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
Here = fso.GetParentFolderName(WScript.ScriptFullName)
sh.Run """" & Here & "\start-bridge.bat""", 0, False
