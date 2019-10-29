# event-flux

`event-flux` is a predictable state container for JavaScript apps.

- Predictable - helps you write applications that behave consistently, run in different environments (client, server, and native), and are easy to test.
- Event-Driven - The stores that have different functions will be connected by event, so different stores decouple from each other.
- Single Data Flow - Like flux and other flux like framework, `event-flux` only flow data from `Store` to UI Components.
- Lazy Load - Every `Store` (like MVC's module) will be loaded and initialized only when UI Component need and can be optional disposed when UI Component don't need it.
- Dependency Inject - Use dependency inject to declare one store's dependencies with other stores.

`event-flux` is the flux-like store management. It manage the complex links in those stores and make the view respond to the store change easy.

[![Travis CI](https://travis-ci.org/event-flux/event-flux.svg?branch=master)](https://travis-ci.org/event-flux/event-flux) [![codecov](https://codecov.io/gh/event-flux/event-flux/branch/master/graph/badge.svg)](https://codecov.io/gh/event-flux/event-flux) [![npm version](https://badge.fury.io/js/event-flux.svg)](https://www.npmjs.com/package/event-flux) [![Downloads](https://img.shields.io/npm/dm/event-flux.svg)](https://www.npmjs.com/package/event-flux)

#### How it run

`event-flux` contains the following objects:

- Store: the state container that like MVC's model.
- AppStore: the store management container. It manage the life cycle of the stores and control the initialization sequence.

`event-flux` use the event-emitter style to notify other stores and components that the store state has changed.

#### Install the package

```bash
npm install event-flux react-event-flux --save
```

require the package by

```javascript
const { StoreBase, AppStore } = require("event-flux");
```

#### How to use

**define Stores**

First, define some stores that your app need. Store object is the class extends `StoreBase` and contains the state.

The `Store` class contains `constructor` function that set the initialization state and some action methods that change the store's state by `setState`.

```javascript
import { StoreBase } from "event-flux";

export default class TodoStore extends StoreBase {
  constructor(key) {
    super();
    this.state = { key, todos: store(key) };
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

Then, create some `PureComponent` that observe the store's state change and `connect` the root store to the container component.

```javascript
const { withState, Filter } = require("event-flux");
class TodoApp extends PureComponent {
  constructor(props, context) {
    super(props);
    this.state = {
      nowShowing: ALL_TODOS,
      editing: null,
      newTodo: ""
    };
  }
}

withEventFlux({
  todoStore: { filter: Filter.FA }
})(TodoApp);
```

The `TodoApp` will observe the `todoStore` state. When the `todoStore` state changes, the TodoApp's props will be changed and the `TodoApp` component's state will be changed.

#### Render the DOM

```javascript
import { Provider } from "react-event-flux";
import TodoApp from "./TodoApp";
import TodoStore from "./TodoStore";

let appStore = new AppStore([TodoStoreDeclarer, TodoGroupStoreDeclarer]).init();

ReactDOM.render(
  <Provider appStore={appStore}>
    <TodoApp />
  </Provider>,
  document.getElementsByClassName("todoapp")[0]
);
```

More info can refer to `https://github.com/event-flux/event-flux-examples`.
