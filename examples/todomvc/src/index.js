import React from "react";
import { render } from "react-dom";
import App from "./components/App";
import "todomvc-app-css/index.css";

import { AppStore, declareStore } from "event-flux";
import { Provider } from "react-event-flux";
import TodoStore from "./stores/TodoStore";

let appStore = new AppStore([declareStore(TodoStore)]).init();

render(
  <Provider appStore={appStore}>
    <App />
  </Provider>,
  document.getElementById("root")
);
