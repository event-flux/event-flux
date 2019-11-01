# Usage with React

We will use React to build our simple app, and cover the basics of how to use React with `event-flux`.

## Installing React event-flux

React bindings are not included in `event-flux` by default. You need to install them explicitly:

```sh
npm install --save react-event-flux
```

## Basic Example

```js
import { StoreBase } from "event-flux";

export default class CounterStore extends StoreBase {
  constructor(appStore) {
    super(appStore);
    this.state = { counter: 0 };
  }

  increment() {
    this.setState({ counter: this.state.counter + 1 });
  }

  decrement() {
    this.setState({ counter: this.state.counter - 1 });
  }
}
```

First we create CounterStore to handle counter state.

```js
import { AppStore, declareStore } from "event-flux";
import { Provider } from "react-event-flux";
import CounterStore from "./CounterStore";

let appStore = new AppStore([declareStore(CounterStore)]).init();

function App() {
  return (
    <Provider appStore={appStore}>
      <TodoApp />
    </Provider>
  );
}
```

Then we create AppStore instance with declaring `CounterStore` and pass this AppStore instance to Provider.

```js
import React from "react";
import { withEventFlux } from "react-event-flux";

class Counter extends React.PureComponent {
  render() {
    return <div>Now the counter is {this.props.counter}</div>;
  }
}

export default withEventFlux({ counterStore: ["counter"] })(Counter);
```

Now we can inject some stores and states to Counter component. For `withEventFlux(eventFluxArgs)`, The key of `eventFluxArgs` is the store key that will be injected, so `counterStore` will be loaded. The value of `eventFluxArgs` is state filter that stand for what shape of state can be injected. The `["counter"]` filter represent that counterStore's `counter` state will be injected and other states in `counterStore` will be ignored.
