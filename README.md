# ri-codex-authentication-server

### Run the authentication server locally

After cloning the project

Create a .env file ( at the same level with "src" folder ) that contains the baseUrl for MLFlow and the port for the application:

```
  CLIENT_ID =yourClientId
  CLIENT_SECRET =yourClientSecret
  IS_LOCAL=True or False
```

now run

```
 npm install
```

then run

```
 npm start
```

Now you should see in the console the message:

"Server started at port: 3002"

### Run the tests

to run the tests you just have to run

```
 npm run test
```
