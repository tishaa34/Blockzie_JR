import { configureStore } from "@reduxjs/toolkit";
import sceneReducer from "./sceneSlice";

const store = configureStore({
  reducer: {
    scene: sceneReducer,
  },
});
export default store;
