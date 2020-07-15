import express from "express";
import http from "http";
import socketIO from "socket.io";
import socketHandler from "./socket";
import routes from "./routes";
import { STATIC_PATH, PORT } from "./config";
import {texts} from "./data"

const app = express();
const httpServer = http.Server(app);
const io = socketIO(httpServer);

app.use(express.static(STATIC_PATH));
routes(app);

app.get("/game/texts/:id", (req, res) => {
  let id = req.params.id;
  if (texts.length){
    res.status(200);
    res.json(texts[id]);
  } else {
    res.status(404);
  }
});

app.get("*", (req, res) => {
  res.redirect("/login");
});
socketHandler(io);

httpServer.listen(PORT, () => {
  console.log(`Listen server on port ${PORT}`);
});
