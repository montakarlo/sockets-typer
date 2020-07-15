import * as config from "./config";
import game from "./game"

export default io => {
  game(io.of("/game"));
};
