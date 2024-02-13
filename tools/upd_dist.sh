#!/usr/bin/bash

# Updates distribution files

# Clean up
rm -f ../dist/riscojs_v2/*.mjs
rm -f ../dist/riscojs_v2/*.js
rm -f ../dist/*
rm -f ../distpacks/*

# Copy files 
cp -rf ../src/*.mjs ../dist/riscojs_v2
cp -rf ../src/*.js ../dist/riscojs_v2

# # Gen distribution archive named after Git version
zip -r "../distpacks/riscojs_v2_$(git rev-parse --short HEAD).zip" ../dist/riscojs_v2

# # Materialize git version on file
echo "$(git rev-parse --short HEAD)" > ../dist/risco_js_version.txt