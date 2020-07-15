import { createElement, addClass, removeClass } from "./helper.mjs";

let roomsContainer = document.getElementById("roomsContainer");
let gameContainer  = document.getElementById("usersInRoom")
const hideRooms = document.getElementById("rooms-page");
const gamePage = document.getElementById("game-page");
const backToRoomsButton = document.getElementById("backToRoomsButton");
const readyButton = document.getElementById("readyButton");
const notReadyButton = document.getElementById("notReadyButton");
const createRoomButton = document.getElementById("createRoomButton");
const text = document.getElementById("text");
let counter = document.getElementById("counter")
let rightTimer = document.getElementById("rightTimerElement")
let timerStartedVar = false;
const username = sessionStorage.getItem("username");
if (!username) {
  window.location.replace("/login");
}
const socket = io("http://localhost:3002/game", { query: { username } });

socket.emit("ADD_USER")

createRoomButton.addEventListener("click", () => {
  let NewRoomName = prompt('Введите имя комнаты')
  socket.emit("CREATE_ROOM", NewRoomName);
});

const updateRooms = (rooms, mapObj) => {
  // socket.emit("DELETE_EMPTY_ROOMS")

  const allRooms = rooms.map(roomId => {
      const RoomBlock = createElement({
        tagName: "div",
        className: "roomItem",
        html: `<div class="roomItem__container"><p class="romItem__connected">${Object.keys(mapObj[roomId]).length} user connected</p></div><p class="romItem__name">${roomId}</p> <button id="${roomId}" class="clickButton">Join</button>`,
        attributes: {id: `RoomItem${roomId}`}
      });
      return RoomBlock;
  });
  roomsContainer.innerHTML = "";
  roomsContainer.append(...allRooms);
  rooms.forEach(roomId => {
    const joinButton = document.getElementById(roomId);
    joinButton.addEventListener("click", () => {
      socket.emit("JOIN_ROOM", roomId);
    });
  });
};

const riseAlert = () => {
  alert(`User with username "${username}" has already connected.\nTry to enter another username`);
  sessionStorage.clear();
  window.location.replace("/login");
}

const joinRoomDone = ({ roomId }) => {
  addClass(hideRooms, "display-none");
  removeClass(gamePage, "display-none");
};

backToRoomsButton.addEventListener("click", () =>{
  const hideRooms = document.getElementById("rooms-page");
  removeClass(hideRooms, "display-none");
  const gamePage = document.getElementById("game-page");
  addClass(gamePage, "display-none");
  socket.emit("BACK_TO_ROOMS");
  addClass(notReadyButton, "display-none");
  removeClass(readyButton, "display-none")
});
readyButton.addEventListener("click", () =>{
  removeClass(notReadyButton, "display-none")
  addClass(readyButton, "display-none");
  socket.emit("CHANGE_STATUS");
});
notReadyButton.addEventListener("click", () =>{
  addClass(notReadyButton, "display-none");
  removeClass(readyButton, "display-none")
  socket.emit("CHANGE_STATUS");
});


const showUser = (usersInRoom, usersInRoomObj) => {
  // console.log(usersInRoomObj)
  try{
    const usersHtml = usersInRoom.map(user => 
      createElement({
          tagName: "div",
          className: "userItem",
          html: `
            <div id="statusContainer" class="statusContainer">
              <div id="${user}Circle" class="circle circle${usersInRoomObj[user].ready}"></div>
              <p id="youFor${user}" class="name">${user}</p>
            </div>
            <div class="progressContainer">
              <div id="${user}Progress" class="progress"></div>
            </div>`,
          attributes: { }}))
      gameContainer.innerHTML = ""
      gameContainer.append(...usersHtml);
  } catch {
    console.log("disconnected")
  }
  if (socket.id == usersInRoomObj[username].socketId){
    showYou(username)
  }
}
let showYou = (user) => {
  document.getElementById(`youFor${user}`).append(" (you)")
}

const alertAnotherRoom = () => {
  alert(`Room with this name has already exist. Try another name`);
}

const changeColor = (user, color) => {
  let circle = document.getElementById(`${user}Circle`)
  if (color == "circletrue"){
    removeClass(circle, "circlefalse")
    addClass(circle, "circletrue")
  } else {
    removeClass(circle, "circletrue")
    addClass(circle, "circlefalse")
  }
}
const hideButtons = () => {
  addClass(notReadyButton, "display-none")
  addClass(backToRoomsButton, "display-none")
}
const changeCounterValue = (value) => {
  counter.innerHTML = value
}

const rightTimerValue = (value) => {
  rightTimer.innerHTML = value
}

let showText = async () => {
  let textId = Math.floor(Math.random() * 7);
  let request = await fetch(`http://localhost:3002/game/texts/${textId}`);
  let result = await request.json()
  removeClass(text, "display-none")
  let textSymbolsArr = result.split('')
  let counter = 0
  textSymbolsArr.forEach(symbol => {
    const element = createElement({
      tagName: "span",
      className: "",
      html: `${symbol}`,
      attributes: {id: `symbol_${counter}`}
    });
    text.append(element)
    if (counter == 0){
      addClass(element, "underlined")
    }
    counter ++
  });
  let idToColor = 0;
  document.addEventListener('keydown', listenerCall(idToColor, textSymbolsArr));
}
function listenerCall (idToColor, textSymbolsArr){
  return function keyPressFunction(event) {
    if (event.key == textSymbolsArr[idToColor]){
      addClass(document.getElementById(`symbol_${idToColor}`), "greenLetter")
      if (textSymbolsArr.length - idToColor > 1){
        removeClass(document.getElementById(`symbol_${idToColor}`), "underlined")
        addClass(document.getElementById(`symbol_${idToColor+1}`), "underlined")
      } else {
        removeClass(document.getElementById(`symbol_${idToColor}`), "underlined")
      }
      idToColor++
      socket.emit("UPDATE_PROGRESS", idToColor+1, textSymbolsArr.length)
    }
  }
}
let updateProgress = (value, user) => {
  if (value == 100){
    document.querySelector(`#${user}Progress`).style.backgroundColor = 'rgb(15, 180, 9)';
  }
  document.querySelector(`#${user}Progress`).style.width = `${value}%`;
}

let removeListener = () => {
  document.removeEventListener('keydown', listenerCall());
}
let roomIsFool = () => {
  alert("Room is full. Choose another one or try again later");
}
let timerStarted = (room) => {
  timerStartedVar = true
}

socket.on("UPDATE_ROOMS", updateRooms);
socket.on("ALERT", riseAlert);
socket.on("JOIN_ROOM_DONE", joinRoomDone);
socket.on("SHOW_USER", showUser);
// socket.on("SHOW_YOU", showYou)
socket.on("ALERT_ANOTER_ROOM", alertAnotherRoom);
socket.on("CHANGE_COLOR", changeColor)
socket.on("HIDE_BUTTONS", hideButtons)
socket.on("CHANGE_COUNTER_VALUE", changeCounterValue)
socket.on("SHOW_TEXT", showText)
socket.on("UPDATE_PROGRESS", updateProgress)
socket.on("RIGHT_TIMER_VALUE", rightTimerValue)
socket.on("REMOVE_LISTENER", removeListener)
socket.on("ROOM_IS_FULL", roomIsFool)
socket.on("TIMER_STARTED", timerStarted)

