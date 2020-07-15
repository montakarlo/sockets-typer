import loginRoutes from "./loginRoutes";
import gameRoutes from "./gameRoutes";
// import gameRoomRoutes from "./gameRoomRoutes";


export default app => {
  app.use("/login", loginRoutes);
  app.use("/game", gameRoutes);
  // app.use("/gameRoom", gameRoomRoutes);
};
