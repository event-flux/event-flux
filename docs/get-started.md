# Getting Started with event-flux

**event-flux** is a modular predictable state container for JavaScript apps.

It helps you write applications that behave consistently, run in different environments (client, server, and native), and are easy to test. On top of that, it provides lazy load and depdendency inject that can improve
the app performance.

You can use `event-flux` together with React, or with any other view library.

## Installation

**event-flux** is available as a package on NPM for use with a module bundler or in a Node application:

```sh
npm install --save event-flux
```

## Basic Example

The AppStore is the container of stores and every store contain the owned states. The AppStore will gather all of the store's states to build a state tree, so the whole state of your app is stored in an object tree from many stores.
The only way to change the state tree is to emit an action of the store.
To specify how the actions transform the state tree, you write action function in store.

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

let appStore = new AppStore([declareStore(CounterStore)]).init();

appStore.onDidChange(state => {
  // It will be like { counter: { counter: 0 } }
  console.log(state);
});

// Request store dynamically
let counterStore = appStore.requestStore("counterStore");

// Dispatch an increment action
counterStore.increment();

// Dispatch an increment action
counterStore.decrement();

// Dispose the counter store
appStore.releaseStore("counterStore");
```

Instead of mutating the state directly, you specify the mutation functions you want to happen with methods called actions. Then you write a special function to decide how to transforms this store's state.

In a typical `event-flux` app, there is just a single app store with many module stores that manage some module state. Each store manage own state by mutation functions. As your app grows, you split the store into smaller stores independently operating on the different parts of the state tree. This is exactly like how there is just one root component in a React app, but it is composed out of many small components.

This architecture might seem like an overkill for a counter app, but the beauty of this pattern is how well it scales to large and complex apps.

## Examples

The `event-flux` repository contains several example projects demonstrating various aspects of how to use `event-flux`. Almost all examples have a corresponding CodeSandbox sandbox. This is an interactive version of the code that you can play with online.

- **Counter**: [Source](https://github.com/event-flux/event-flux/tree/master/examples/counter) | [Sandbox](https://codesandbox.io/s/github/event-flux/event-flux/tree/master/examples/counter)
- **Multi Todos**: [Source](https://github.com/event-flux/event-flux/tree/master/examples/multitodos) | [Sandbox](https://codesandbox.io/s/github/event-flux/event-flux/tree/master/examples/multitodos)
- **Todo MVC**: [Source](https://github.com/event-flux/event-flux/tree/master/examples/todomvc) | [Sandbox](https://codesandbox.io/s/github/event-flux/event-flux/tree/master/examples/todomvc)
