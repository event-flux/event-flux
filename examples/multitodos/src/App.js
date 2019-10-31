import React from "react";
import logo from "./logo.svg";
import "todomvc-common/base.css";
import "todomvc-app-css/index.css";
import "./App.css";

import { AppStore } from "event-flux";
import { Provider } from "react-event-flux";
import TodoStoreDeclarer from "./TodoStore";
import TodoApp from "./TodoApp";
import TodoGroupStoreDeclarer from "./TodoGroupStore";

function App() {
  let appStore = new AppStore([TodoStoreDeclarer, TodoGroupStoreDeclarer]);
  appStore.init();
  return (
    <Provider appStore={appStore}>
      <TodoApp />
    </Provider>
  );
}

export default App;
