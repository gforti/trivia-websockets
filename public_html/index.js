// Setup basic express server
var express = require('express')
var app = express()
var path = require('path')
var server = require('http').createServer(app)
var io = require('socket.io')(server)
var port = process.env.PORT || 3000
const host_ip = require('./host-ip')
var gameUrl = `http://${host_ip}:${port}`


var questions = []
var curQuestion = 0;
var totalQuestions = 0;

var nextQuestionDelayMs = 5000; //5secs // how long are players 'warned' next question is coming
var timeToAnswerMs = 15000; // 15secs // how long players have to answer question
var timeToEnjoyAnswerMs = 10000; //10secs // how long players have to read answer

var answerData;
var answerDetails;
var players = {};

var gameInProgress = false
var questionPhase = 1


server.listen(port, function () {
  console.log('Game url', gameUrl);
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));



io.on('connection', function (socket) {
  var addedUser = false;


  socket.on('host', function () {
    socket.emit('host-game-info', {
      gameUrl: gameUrl,
      numUsers: Object.keys(players).length,
       players : players,
       gameInProgress: gameInProgress
    });
  });


  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (data) {
    if ( players[socket.id]) return;

    // we store the username in the socket session for this client

    data.points = 0
    data.correct = false
    data.questionDone = false
    data.questionReady = false
    players[socket.id] = Object.assign({}, data);

    addedUser = true;
    socket.emit('login', {
        userid: socket.id,
        numUsers: Object.keys(players).length,
        gameInProgress: gameInProgress
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      numUsers: Object.keys(players).length,
      players : players
    });
  });



    socket.on('start', function (data) {
        let round = `./round${data.round}`
        questions = shuffle(require(round))
        totalQuestions = questions.length;
        curQuestion = 0;
        resetPlayerNewRound()
        emitNewQuestion();
    });



    socket.on('answer', function (data) {
        if (!players[socket.id]) return
        players[socket.id].correct = false
        if ( answerData == data.answer) {
            players[socket.id].correct = true
            players[socket.id].points++
        }

    });


    socket.on('question timer', function () {
        if (!players[socket.id]) return
        if ( questionPhase === 1 ) {
            players[socket.id].questionReady = true
        } else {
            players[socket.id].questionDone = true
        }
    });



  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (players[socket.id]) {
     delete players[socket.id]

      // echo globally that this client has left
      socket.broadcast.emit('user joined', {
        numUsers: Object.keys(players).length,
        players : players
      });


    }
  });
});



function resetPlayerWinners() {
    Object.keys(players)
                    .forEach(id => {
                        players[id].correct = false
                        players[id].questionDone = false
                        players[id].questionReady = false
                    })
}


function resetPlayerNewRound() {
    gameInProgress = true
    Object.keys(players)
                    .forEach(id => {
                        players[id].points = 0
                    })
}


function emitWinner() {

    // todo: get all winners or set game to give point to just first who answers
    // maybe just get a list of winners and display the winners differently

    const mostAnswered = Math.max.apply(Math,Object.keys(players)
                .map(key => players[key].points))

    var winners = Object.keys(players)
                .filter(key => players[key].points === mostAnswered)
                .map(key => players[key].username)
    gameInProgress = false

    io.sockets.emit('winner', winners);

}

function emitNewQuestion() {

    if ( curQuestion < totalQuestions ) {

        resetPlayerWinners()
        questionPhase = 1
        io.sockets.emit('question', {
            totalTime: nextQuestionDelayMs,
            endTime: new Date().getTime() + nextQuestionDelayMs,
            choices: [],
            question:'Next Question ...',
            img: 'loading.gif',
            questionsLeft: `${curQuestion+1}/${totalQuestions}`
        });

        checkQuestionReady()
    } else {
        emitWinner()
    }

}


function checkQuestionReady(time) {

    time = time || nextQuestionDelayMs
    setTimeout(function(){
        var canEmitQuestion = Object.keys(players).every(key =>{
            return players[key].questionReady === true
        });
        if (canEmitQuestion) {
            if (questions[curQuestion]) {
                var q = questions[curQuestion];
                var timeToAnswer = q.timeToAnswerMs || timeToAnswerMs
                q.endTime = new Date().getTime() + timeToAnswer;
                q.totalTime = timeToAnswer;

                answerData = q.answer
                answerDetails = q.details || ''

                q.choices = shuffle(q.choices)
                q.questionsLeft = `${curQuestion+1}/${totalQuestions}`
                io.sockets.emit('question', q);

                curQuestion++;

               questionPhase = 2
               checkQuestionTimer(timeToAnswer)
            }
        } else {
            checkQuestionReady(200)
        }
    }, time);

}

function checkQuestionTimer(time) {

    time = time || timeToAnswerMs
    setTimeout(function(){
        var canEmitAnswer = Object.keys(players).every(key =>{
            return players[key].questionDone === true
        });
        if (canEmitAnswer) {
            emitAnswer();
        } else {
            checkQuestionTimer(200)
        }
    }, time);

}


function emitAnswer() {

    let data = {}
    data.correctAnswer = answerData;
    data.answerDetails = answerDetails;
    data.endTime = new Date().getTime() + timeToEnjoyAnswerMs;
    data.totalTime = timeToEnjoyAnswerMs;

    io.sockets.emit('correct answer', data); // emit to everyone (no winner)

    io.sockets.emit('answer results', players);

    var leader = Object.keys(players)
                    .map(key => players[key])
                    .reduce((prev, current) => (prev.points > current.points) ? prev : current, {})

    io.sockets.emit('leader', leader);


    setTimeout(function(){
        emitNewQuestion();
    }, timeToEnjoyAnswerMs);

}


function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}