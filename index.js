// Setup basic express server
let express = require('express')
let app = express()
let path = require('path')
let server = require('http').createServer(app)
let io = require('socket.io')(server)
let port = process.env.PORT || 3000
const host_ip = require('./host-ip')
let gameUrl = `http://${host_ip}:${port}`


let questions = []
let curQuestion = 0;
let totalQuestions = 0;

let nextQuestionDelayMs = 5000; //5secs // how long are players 'warned' next question is coming
let timeToAnswerMs = 15000; // 15secs // how long players have to answer question
let timeToEnjoyAnswerMs = 10000; //10secs // how long players have to read answer

let answerData;
let answerDataES;
let answerDetails;
let answerDetailsES;
let players = {}
let removedPlayers = {}

let gameInProgress = false
let questionPhase = 1


server.listen(port, function () {
  console.log('Game url', gameUrl);
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));



io.on('connection', function (socket) {
  let addedUser = false;


  socket.on('host', function () {
    socket.emit('host-game-info', {
      gameUrl: gameUrl,
      numUsers: Object.keys(players).length,
      players: players,
      gameInProgress: gameInProgress
    });
    if(gameInProgress) {
      emitLeader()
    }
  });


  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (data) {
    if (players[socket.id]) return;

    // we store the username in the socket session for this client
    if (data.userid && removedPlayers[data.userid]) {
      // allow session reconnects
      players[socket.id] = Object.assign({}, removedPlayers[data.userid])
      players[socket.id].username = data.username
      players[socket.id].icon = data.icon
    } else {
      data.points = 0
      players[socket.id] = Object.assign({}, data)
    }

    players[socket.id].correct = false
    players[socket.id].questionDone = false
    players[socket.id].questionReady = false
    players[socket.id].answerSelected = ''

    addedUser = true;
    socket.emit('login', {
      userid: socket.id,
      numUsers: Object.keys(players).length,
      gameInProgress: gameInProgress,
      points: players[socket.id].points
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      numUsers: Object.keys(players).length,
      players: players
    });

    if(gameInProgress) {
      emitLeader()
    }

  });



  socket.on('start', function (data) {
    let round = `./round${data.round}`
    questions = shuffle(require(round))
    totalQuestions = questions.length;
    curQuestion = 0;
    removedPlayers = {}
    resetPlayerNewRound()
    emitNewQuestion()
    io.sockets.emit('new game', players)
  });



  socket.on('answer', function (data) {
    if (!players[socket.id]) return
    players[socket.id].correct = false
    players[socket.id].answerSelected = data.answer
    if (answerData == data.answer || answerDataES == data.answer) {
      players[socket.id].correct = true
      players[socket.id].points++
    }

  });


  socket.on('question timer', function () {
    if (!players[socket.id]) return
    if (questionPhase === 1) {
      players[socket.id].questionReady = true
    } else {
      players[socket.id].questionDone = true
    }
  });



  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (players[socket.id]) {
      removedPlayers[socket.id] = Object.assign({}, players[socket.id])
      delete players[socket.id]

      // echo globally that this client has left
      socket.broadcast.emit('user joined', {
        numUsers: Object.keys(players).length,
        players: players
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
      players[id].answerSelected = ''
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

  const mostAnswered = Math.max.apply(Math, Object.keys(players)
    .map(key => players[key].points))

  let winners = Object.keys(players)
    .filter(key => players[key].points === mostAnswered)
    .map(key => players[key].username)
  gameInProgress = false

  io.sockets.emit('winner', winners);

}

function emitNewQuestion() {

  if (curQuestion < totalQuestions) {

    resetPlayerWinners()
    questionPhase = 1
    io.sockets.emit('question', {
      totalTime: nextQuestionDelayMs,
      endTime: new Date().getTime() + nextQuestionDelayMs,
      choices: [],
      choicesES: [],
      question: 'Next Question ...',
      questionES: 'Próxima pregunta ...',
      img: 'loading.gif',
      questionsLeft: `${curQuestion + 1}/${totalQuestions}`
    });

    checkQuestionReady()
  } else {
    emitWinner()
  }

}


function checkQuestionReady(time) {

  time = time || nextQuestionDelayMs
  setTimeout(function () {
    let canEmitQuestion = Object.keys(players).every(key => {
      return players[key].questionReady === true
    });
    if (canEmitQuestion) {
      if (questions[curQuestion]) {
        let q = questions[curQuestion];
        let timeToAnswer = q.timeToAnswerMs || timeToAnswerMs
        q.endTime = new Date().getTime() + timeToAnswer;
        q.totalTime = timeToAnswer;

        answerData = q.answer
        answerDataES = q.answerES || ''
        answerDetails = q.details || ''
        answerDetailsES = q.detailsES || ''

        q.choices = shuffle(q.choices)
        if(q.choicesES) {
          q.choicesES = shuffle(q.choicesES)
        }
        q.questionsLeft = `${curQuestion + 1}/${totalQuestions}`
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
  setTimeout(function () {
    let canEmitAnswer = Object.keys(players).every(key => {
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
  data.correctAnswerES = answerDataES;
  data.answerDetails = answerDetails;
  data.answerDetailsES = answerDetailsES;
  data.endTime = new Date().getTime() + timeToEnjoyAnswerMs;
  data.totalTime = timeToEnjoyAnswerMs;

  io.sockets.emit('correct answer', data); // emit to everyone

  io.sockets.emit('answer results', players);

  emitLeader()

  setTimeout(function () {
    emitNewQuestion();
  }, timeToEnjoyAnswerMs);

}


function emitLeader() {
  let leader = Object.keys(players)
    .map(key => players[key])
    .reduce((prev, current) => (prev.points > current.points) ? prev : current, {})

  io.sockets.emit('leader', leader);
}

function shuffle(array) {
  let currentIndex = array.length, temporaryValue, randomIndex;

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
