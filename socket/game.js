import {users, texts} from "../data";
import {MAXIMUM_USERS_FOR_ONE_ROOM,
  SECONDS_TIMER_BEFORE_START_GAME,
  SECONDS_FOR_GAME} from "./config";
// var express = require('express');
// var router = express.Router();

var rooms = [];
var usersInRoomMap = new Map(rooms.map(roomId => [roomId, {}]));
const getCurrentRoomId = socket => Object.keys(socket.rooms).find(roomId => usersInRoomMap.has(roomId));
var startedRooms = new Map()
export default io => {
  io.on("connection", socket => {  
    var timerStarted = false;
    var gameStarted = false;
    let activeRoomNow;
    let finishedOrder = 1;
    var finishedUsers = [];
    let resultWasShowed = false;
    socket.emit("UPDATE_ROOMS", rooms, Object.fromEntries(usersInRoomMap));
    var username = socket.handshake.query.username;
    var usernameIndex = users.indexOf(username)
    let backToRooms = () => {
      socket.leave(activeRoomNow, () => {
        let roomObject = usersInRoomMap.get(activeRoomNow)
        let allConnectedUsers = []
        for (let i in roomObject){
          allConnectedUsers.push(i)
        }
        let connectedUserIndex = allConnectedUsers.indexOf(username)
        if (connectedUserIndex != -1){
          delete roomObject[username]
          allConnectedUsers.splice(connectedUserIndex,1)
        }
        deleteEmptyRooms(roomObject);
        io.to(activeRoomNow).emit("SHOW_USER", allConnectedUsers, roomObject);
        io.emit("UPDATE_ROOMS", rooms, Object.fromEntries(usersInRoomMap));
        io.to(socket.id).emit("CHANGE_COUNTER_VALUE", "");
        if (!startedRooms.get(activeRoomNow)) {
          timerBeforeStart()
        }
      });
    }
    let deleteEmptyRooms = (roomObject) => {
      let usersArr = Object.keys(roomObject)
      if (usersArr.length == 0) {
        delete usersInRoomMap[activeRoomNow]

        let roonId = rooms.indexOf(activeRoomNow)
        rooms.splice(roonId, 1)
      }
    }

    let joinToRoom = (roomId) => {
      let conUsers = Object.keys(usersInRoomMap.get(roomId))
        
      socket.join(roomId, () => {
        io.to(socket.id).emit("JOIN_ROOM_DONE", roomId);
        let roomObject = usersInRoomMap.get(roomId)
        roomObject[username] = {"ready": false, "socketId": socket.id, "progress": 0}
        let usersInRoom = Object.keys(roomObject);
        io.to(roomId).emit("SHOW_USER", usersInRoom, roomObject);
        io.emit("UPDATE_ROOMS", rooms, Object.fromEntries(usersInRoomMap));
        activeRoomNow = roomId     
        if (MAXIMUM_USERS_FOR_ONE_ROOM - conUsers.length == 1) { 
          io.emit("HIDE_ROOM", roomId);
        }   
      });
      // socket.emit("ROOM_IS_FULL");  
    }

    socket.on("ADD_USER", () => {
      if (usernameIndex == -1 ){
        users.push(username)
      } else {
        socket.emit("ALERT")
      }
    })

    socket.on("JOIN_ROOM", roomId => {
      joinToRoom(roomId)
    });

    socket.on("BACK_TO_ROOMS", () => {
      const activeRoomNow = activeRoomNow
      backToRooms(activeRoomNow)
    })
    
    socket.on("CREATE_ROOM", (newRoom) => {
      const newRoomIndex = rooms.indexOf(newRoom)
      if (newRoomIndex == -1 && newRoom){
        rooms.push(newRoom)
        usersInRoomMap.set(newRoom, {})
        io.emit("UPDATE_ROOMS", rooms, Object.fromEntries(usersInRoomMap));
        joinToRoom(newRoom)
      } else {
        socket.emit("ALERT_ANOTER_ROOM")
      }
    })

    let showResults = () => {
      let roomObject = usersInRoomMap.get(activeRoomNow)
      let allConnectedUsers = []
      for (let i in roomObject){
        allConnectedUsers.push([i, roomObject[i].progress])
      }
      allConnectedUsers.sort(function(a, b) {
        return -a[1] + b[1];
      });      
      let arrToShow = []
      let allProgresses = []
      allConnectedUsers.forEach(element => {
        arrToShow.push(element[0])
        allProgresses.push(element[1])
      });
      return arrToShow
    }

    let checkBeforeShow = () => {
      console.log(gameStarted, resultWasShowed);
      if (gameStarted && !resultWasShowed) {
        let sortedArr = showResults();
        let sortedArrCopy = [...sortedArr]
        sortedArrCopy.forEach(sortedUser => {
          finishedUsers.forEach(finished => {
            if (finished == sortedUser){
              let index = sortedArr.indexOf(sortedUser)
              sortedArr.splice(index, 1)
            }
          });
        });
        finishedUsers.push(...sortedArr)
        resultWasShowed = true
        io.to(activeRoomNow).emit("SHOW_RESULTS", finishedUsers)
        io.to(activeRoomNow).emit("DELETE_TIMER")
        io.to(activeRoomNow).emit("SHOW_EVTH_AGAIN")
        io.to(socket.id).emit("JOIN_ROOM_DONE", activeRoomNow);
        let roomObject = usersInRoomMap.get(activeRoomNow)
        let usersInRoom = Object.keys(roomObject);
        io.to(activeRoomNow).emit("SHOW_USER", usersInRoom, roomObject);

      }
    }
    let gameTimer = () => {
      let counter = SECONDS_FOR_GAME;
      gameStarted = true;
        const interval = setInterval(() => {
          if (counter > 0){
            io.to(activeRoomNow).emit("RIGHT_TIMER_VALUE", `${counter} seconds left`);
      
          }
          counter--;
          if (counter < 0 ) {
            clearInterval(interval);
            io.to(activeRoomNow).emit("RIGHT_TIMER_VALUE", 'Time is over');
            io.to(activeRoomNow).emit("REMOVE_LISTENER");
            checkBeforeShow();
            gameStarted = false;
          }
        }, 1000);
    }

    let timerBeforeStart = () => {
      let seconds = SECONDS_TIMER_BEFORE_START_GAME
      let roomObject = usersInRoomMap.get(activeRoomNow)
      let allStatuses = []
      let allConnectedUsers = Object.keys(roomObject)
      allConnectedUsers.forEach(user => {
        allStatuses.push(roomObject[user].ready)
      });
      if (allStatuses.indexOf(false) == -1 && allStatuses.length){
        io.emit("HIDE_ROOM", activeRoomNow)
        startedRooms.set(activeRoomNow, true)
        // timerStarted = true

        io.emit("HIDE_BUTTONS");
        let counter = seconds;
        const interval = setInterval(() => {
          if (counter > 0){
            io.to(activeRoomNow).emit("CHANGE_COUNTER_VALUE", counter);
          }
          counter--;
          if (counter < 0 ) {
            clearInterval(interval);
            io.to(activeRoomNow).emit("CHANGE_COUNTER_VALUE", "");
            gameStarted = true
            gameTimer();
            io.to(activeRoomNow).emit("SHOW_TEXT");
            // timerStarted = false
          }
        }, 1000);
        
      }
    }

    socket.on("CHANGE_STATUS", () => {
      let roomObject = usersInRoomMap.get(activeRoomNow)
      let allConnectedUsers = []
      let color = ""
      for (let i in roomObject){
        allConnectedUsers.push(i)
      }
      if (allConnectedUsers.indexOf(username) != -1){
        let userObj = roomObject[username]
        if (userObj.ready){
          userObj.ready = false
          color = "circlefalse"
        } else{
          userObj.ready = true
          color = "circletrue"
        }
      }
      io.to(activeRoomNow).emit("SHOW_USER", allConnectedUsers, roomObject);
      io.to(activeRoomNow).emit("CHANGE_COLOR", username, color)
      if (!startedRooms.get(activeRoomNow)) {
        timerBeforeStart()
      }
    })
    
    socket.on("UPDATE_PROGRESS", (done, all) => {
      let roomObject = usersInRoomMap.get(activeRoomNow)
      let userObj = roomObject[username]
      let users = Object.keys(roomObject)
      let value = 100*(done-1)/all
      userObj.progress = value
      let progressesArr = [];
      io.to(activeRoomNow).emit("UPDATE_PROGRESS", value, username);
      if (value == 100){
        userObj.finished = finishedOrder
        finishedOrder++
        io.to(socket.id).emit("REMOVE_LISTENER");
      }
      users.forEach(user => {
        let obj = roomObject[user]
        if (obj.progress == 100 && finishedUsers.indexOf(user) == -1){
          finishedUsers.push(user)
        }
        progressesArr.push(obj.progress)
      });
      if (progressesArr.every(el => el == 100)){
        resultWasShowed = true;
        // setTimeout( () => {io.to(activeRoomNow).emit("SHOW_RESULTS", finishedUsers)}, 100);
        checkBeforeShow();
      }
    });
    socket.on("disconnect", () => {
      // console.log(`${socket.id} disconnected`);
      users.splice(usernameIndex,1)
      if (activeRoomNow) {
        backToRooms(activeRoomNow)
      } else {
        io.to(socket.id).emit("DISCONNECT")
        console.log("DISCONNECT")
      }
    });
  });
};

