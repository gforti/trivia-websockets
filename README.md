# Trivia WebSockets

This is a Christmas trivia game that uses websockets.  The idea is that the host will display the questions and the players 
will use their device to to answer the questions.

**Note** that each device runs javascript faster or slower so there can be a delay on when the questions will show up.
Each device when the timer runs out will send a single to the host to know everyone has had the chance to answer or not.

If it is a bit slow do not panic it will send the signal.

If the user disconnects then it does not need to wait for that signal.  The user can rejoin.

> Make sure to run the command that will install the dependencies

```sh
$ npm install
```

Now we can start the server with the following command

```sh
$ npm start
```

> `index.html` will run a on `http://localhost:3000/` This is where players will connect to

> Run `http://localhost:3000/host.html` on the host machine that will be displayed to everyone

### Testing localhost on your mobile device

This application connects on `0.0.0.0` which will resolve to localhost based on your network IP address.

On a windows prompt you should be able to check your network IP address with

```sh
$ ipconfig
```

The following IP address with `:3000` as the host should give you access on your mobile device

```sh
IPv4 Address. . . . . . . . . . . : 192.x.x.x
```

`192.x.x.x:3000` should be entered 

> Firewalls could block this from working

Feel free to update the `.env` file with this ip address so players can view the address from to host to connect