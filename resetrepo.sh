#!/bin/bash
mkdir .tmp
mv showcase/config .tmp/config
mv showcase/passport .tmp/passport
rm -rf showcase
git clone https://github.com/dmg01/showcase
mv .tmp/config showcase/
mv .tmp/passport showcase/passport
mkdir showcase/files
rm -rf .tmp
npm install
