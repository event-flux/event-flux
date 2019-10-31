import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-event-flux";
import { AppStore, declareStore } from "event-flux";
import Counter from "./components/Counter";
import CounterStore from "./stores/CounterStore";

let appStore = new AppStore([declareStore(CounterStore)]).init();
const rootEl = document.getElementById("root");

const render = () =>
  ReactDOM.render(
    <Provider appStore={appStore}>
      <Counter />
    </Provider>,
    rootEl
  );

render();
