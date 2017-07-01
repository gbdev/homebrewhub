#!/bin/bash
rm -rf passport/
mkdir passport
mongod --dbpath=passport --port 27018
