
# Atualiza conteudo do site de teste e inicia webserver local

Remove-Item -Path "dist\*.js"

Copy-Item -Path "src\*.js" -Destination "dist\riscojs_v2"
Copy-Item -Path "src\*.js" -Destination "testbed\js\riscojs_v2"

Compress-Archive -Path "dist\riscojs_v2" -DestinationPath "riscojs_v2.zip" -Force

python -m http.server --directory testbed 9000
