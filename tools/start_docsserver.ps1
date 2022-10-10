
# Parse dos comentarios jsdoc
python .\parsejsdoc.py

# Build dos docs
Remove-Item "..\docs\build\*.*" -Recurse -Force
sphinx-build -b html ..\docs\source ..\docs\build\html

# Servir
python -m http.server --directory ..\docs\build\html 9100
