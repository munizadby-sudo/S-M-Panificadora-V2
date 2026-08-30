' Sobe o MySQL do XAMPP sem janela. Colocado na pasta Inicializar do Windows.
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\xampp"
sh.Run "C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini --standalone", 0, False
