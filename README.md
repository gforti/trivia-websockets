# Trivia WebSockets

This is a Christmas trivia game that uses websockets.  The idea is that the host will display the questions and the players 
will use their device to answer the questions.

**Note** that each device runs javascript faster or slower so there can be a delay between questions/answers as they show up.
Each device, when the timer runs out, will send a single to the host. This gives everyone the chance to answer.

If it is a bit slow do not panic it will send the signal.

If the user disconnects then it does not need to wait for that signal.  The user can rejoin.

# Setup

## Configure your IP address

> Everyone must be connected to the same network to play.

This application connects on `0.0.0.0` which will resolve to localhost based on your network IP address.

On a terminal prompt you should be able to check your network IP address with

```sh
$ ipconfig
```
MAC
```sh
$ ifconfig | grep "inet " | grep -v 127.0.0.1
```

The following IP address with as the host should give you access on your mobile device

```sh
IPv4 Address. . . . . . . . . . . : 192.x.x.x
```

`192.x.x.x:3000` should be entered 

> Firewalls could block this from working

**UPDATE** the `host-ip.js` file with this ip address `x.x.x.x` (without :3000) so players can view the address from to host to connect, 

## Start the server

You must have `node.js` installed on your machine.  This will also install `npm` as well. 

Once installed to into the following folder: `public_html`.  You should see the `package.json` file.  If so you are in the correct folder.

Open a command prompt or terminal window for the next instructions inside of the `public_html` folder

> Make sure to run the command that will install the dependencies

```sh
$ npm install
```

Now we can start the server with the following command

```sh
$ npm start
```

## Play the Game

> `index.html` will run a on `http://[IP address]:3000/` This is where players will connect to

> Run `http://localhost:3000/host.html` on the host machine that will be displayed to everyone

### Enjoy!

