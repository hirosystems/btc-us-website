#!/bin/bash
rm -rf __sapper__/export
sapper export --entry "${1:-/export}" && cp serve.json __sapper__/export
rm -rf __sapper__/export/export
cp serve.json __sapper__/export
cp _redirects __sapper__/export

