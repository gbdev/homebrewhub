# showcase

## Work on the project

**Requisites**: node, mongodb

Edit the configuration

- `config/database.js` mongodb instance details
- `config/passport.js` SMTP email server configuration


Clone the repo
```
git clone https://github.com/dmg01/showcase
```


Start mongodb server
```
cd showcase
mkdir database
mongod --dbpath=databse --port 27018
```

Node things
```
cd showcase
npm install
npm start
```

Your instance is live at `localhost:8080/`