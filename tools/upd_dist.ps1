
# Atualiza conteudo do site de teste e inicia webserver local

Remove-Item -Path "..\dist\riscojs_v2\*.mjs"
Remove-Item -Path "..\dist\riscojs_v2\*.js"

Copy-Item -Path "..\src\*" -Include "*.js","*.mjs" -Destination "..\dist\riscojs_v2" -Recurse

Compress-Archive -Path "..\dist\riscojs_v2" -DestinationPath "..\distpacks\riscojs_v2_$(git log --pretty=format:'%h' -1).zip" -Force

Set-Content -Path "..\dist\risco_js_version.txt" -Value "$(git rev-parse --short HEAD)"


