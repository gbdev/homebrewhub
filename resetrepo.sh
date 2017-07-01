mkdir .tmp
mv showcase/config .tmp/config
rm -rf showcase
git clone https://github.com/dmg01/showcase
mv .tmp/config showcase/config
mkdir showcase/files
rm -rf .tmp
