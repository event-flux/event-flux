import { uuid, store, extend } from "./util";
import { StoreBase } from "event-flux";
import { SHOW_ALL } from "../constants/TodoFilters";

const initialTodos = [
  { id: uuid(), title: "Use Event Flux", completed: false }
];

export default class TodoStore extends StoreBase {
  init() {
    this.setState({ todos: store("todos") || initialTodos, filter: SHOW_ALL });
  }

  addTodo(title) {
    let todos = this.state.todos.concat({
      id: uuid(),
      title: title,
      completed: false
    });
    this.storeData(todos);
  }

  storeData(todos) {
    store("todos", todos);
    this.setState({ todos });
  }

  toggleAll(checked) {
    // Note: it's usually better to use immutable data structures since they're
    // easier to reason about and React works very well with them. That's why
    // we use map() and filter() everywhere instead of mutating the array or
    // todo items themselves.
    const areAllMarked = this.state.todos.every(todo => todo.completed);

    let todos = this.state.todos.map(function(todo) {
      return extend({}, todo, { completed: !areAllMarked });
    });
    this.storeData(todos);
  }

  toggle(todoToToggle) {
    let todos = this.state.todos.map(function(todo) {
      return todo !== todoToToggle
        ? todo
        : extend({}, todo, { completed: !todo.completed });
    });
    this.storeData(todos);
  }

  destroy(todo) {
    let todos = this.state.todos.filter(function(candidate) {
      return candidate !== todo;
    });
    this.storeData(todos);
  }

  save(todoToSave, text) {
    let todos = this.state.todos.map(function(todo) {
      return todo !== todoToSave ? todo : extend({}, todo, { title: text });
    });
    this.storeData(todos);
  }

  clearCompleted() {
    let todos = this.state.todos.filter(function(todo) {
      return !todo.completed;
    });
    this.storeData(todos);
  }

  setFilter(filter) {
    this.setState({ filter });
  }
}
