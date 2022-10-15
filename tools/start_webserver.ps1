
# Atualiza conteudo do site de teste e inicia webserver local

Remove-Item -Path "..\dist\riscojs_v2\*.mjs"
Remove-Item -Path "..\dist\riscojs_v2\*.js"

Remove-Item -Path "..\testbed\js\riscojs_v2\*.mjs"
Remove-Item -Path "..\testbed\js\riscojs_v2\*.js"

Copy-Item -Path "..\src\*" -Include "*.js","*.mjs" -Destination "..\dist\riscojs_v2"
Copy-Item -Path "..\src\*" -Include "*.js","*.mjs" -Destination "..\testbed\js\riscojs_v2"

Compress-Archive -Path "..\dist\riscojs_v2" -DestinationPath "..\riscojs_v2.zip" -Force

python -m http.server --directory ../testbed 9000
