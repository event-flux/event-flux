# event-flux

**event-flux** is a modular predictable state container for JavaScript apps.

- **Predictable** - helps you write applications that behave consistently, run in different environments (client, server, and native), and are easy to test.
- **Modular** - `event-flux` contain many stores that act the specific role, such as `userStore` that handle the user information, `tradeStore` handle the trade specific features. In a standard event flux app, we will create many stores that related to the specific business. Those stores contain the owned state that specified to the store's business by `this.state` like `React`.
- **Event Driven** - The stores that have different functions will be driven by event, so different stores decouple from each other.
- **Single Data Flow** - Like flux and other flux like framework, `event-flux` only flow data from `Store` to UI Components.
- **Lazy Load** - Every `Store` (like MVC's module) will be loaded and initialized only when UI Component need and can be optional disposed when UI Component don't need it.
- **Dependency Inject** - Use dependency inject to declare one store's dependencies with other stores.

**event-flux** is the flux-like store management. It manage the complex states and links in those stores and make the view respond to the state change easily.

[![Travis CI](https://travis-ci.org/event-flux/event-flux.svg?branch=master)](https://travis-ci.org/event-flux/event-flux) [![codecov](https://codecov.io/gh/event-flux/event-flux/branch/master/graph/badge.svg)](https://codecov.io/gh/event-flux/event-flux) [![npm version](https://badge.fury.io/js/event-flux.svg)](https://www.npmjs.com/package/event-flux) [![Downloads](https://img.shields.io/npm/dm/event-flux.svg)](https://www.npmjs.com/package/event-flux)

#### How it run

**event-flux** contains the following objects:

- Store: The state container like MVC's model that contain the specific functions.
- State: Every store will contain the owned state and this store can change the state by method.
- AppStore: The container of Store. It manage the life cycle of the stores and control the initialization sequence.

There are many stores in a large scale `event-flux` application, so the AppStore will contain the store tree. AppStore also collect the store's states to the state tree, so the view can get the full state tree to render like `Redux`.

`event-flux` use the event-emitter style to notify other stores and components that the store state has changed.

#### Install the package

```bash
npm install event-flux react-event-flux --save
```

require the package by

```javascript
import { StoreBase, AppStore } from "event-flux";
```

Refer the doc [event-flux](https://event-flux.gitbook.io/event-flux/).

#### How to use

**define Stores**

First, define some stores that your app need. Store is the class extends `StoreBase` and contains the state.

The `Store` can set the initialization state in `constructor` function and add some action methods that change the store's state by `setState`.

```javascript
import { StoreBase } from "event-flux";

export default class TodoStore extends StoreBase {
  constructor() {
    super();
    this.state = { todos: store(key) };
  }

  addTodo(title) {
    let todos = this.state.todos.concat({
      title: title,
      completed: false
    });
    this.setState({ todos });
  }
}
```

#### define React Component

Then, create some React component just like before.

```javascript
class TodoItem extends PureComponent {
  constructor(props) {
    super(props);
    this.state = { editText: props.todo.title };
  }
}
```

#### define some container Components

Then, create some `PureComponent` that observe the store's state change and `connect` the root store to the container component with `withEventFlux`.

```javascript
import { withEventFlux, Filter } from "react-event-flux";

class TodoApp extends PureComponent {
  constructor(props, context) {
    super(props);
    this.state = {
      nowShowing: "all",
      editing: null,
      newTodo: ""
    };
  }
}

export default withEventFlux({
  todoStore: Filter.FA
})(TodoApp);
```

In the above code, `withEventFlux` import the `todoStore` and all of the state of `todoStore` to `TodoApp` component by `Filter.FA`. The argument of `withEventFlux` is the object where key is the store key that will be required and value is the state filter. In the above code snippet, the store `todoStore` will be loaded and injected the `TodoApp` and the `Filter.FA` mean the state of `todoStore` will all filter to this component.

The `TodoApp` will observe the full state tree. When the `todoStore` state changes, `AppStore` will forward the state of `todoStore` to `TodoApp` so the TodoApp's props will be changed and the `TodoApp` component will render self.

#### Render the DOM

```javascript
import { Provider } from "react-event-flux";
import TodoApp from "./TodoApp";
import { declareStore } from "event-flux";
import TodoStore from "./TodoStore";

let appStore = new AppStore([declareStore(TodoStore)]).init();

ReactDOM.render(
  <Provider appStore={appStore}>
    <TodoApp />
  </Provider>,
  document.getElementsByClassName("todoapp")[0]
);
```

This app create AppStore instance with TodoStore declarer. The `declareStore` will declare the Store and set some options such as `storeKey`. The store declarer will not create the store instance, it only declare the Store class. In this code snippet, we declare `TodoStore` Store class. The Store will be instantiated when UI needed by `withEventFlux`.

More examples can refer to `https://github.com/event-flux/event-flux/tree/master/examples`.
