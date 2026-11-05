' debao bridge watchdog - keep 127.0.0.1:53210 alive.
' Pure ASCII on purpose: wscript reads .vbs as ANSI, UTF-8 Chinese would break parsing.
Option Explicit

Dim sh, fso, here, running, http
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)

Do
  running = False
  On Error Resume Next
  Set http = CreateObject("MSXML2.XMLHTTP")
  http.Open "GET", "http://127.0.0.1:53210/health", False
  http.Send
  If Err.Number = 0 Then
    If http.Status = 200 Then running = True
  End If
  Err.Clear
  On Error GoTo 0

  If Not running Then
    sh.Run """" & here & "\start-bridge.bat""", 0, False
  End If

  WScript.Sleep 45000
Loop
