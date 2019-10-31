import { StoreBase, declareStoreMap } from "event-flux";
import { declareStore } from "event-flux";
import { store } from "./util";

export class TodoGroupStore extends StoreBase {
  constructor() {
    super();
    this.state = {
      todoGroups: store("todoGroups") || ["default"],
      activeGroup: store("activeGroup") || "default"
    };
  }

  addTodoGroup(name) {
    let { todoGroups } = this.state;
    if (todoGroups.indexOf(name) !== -1) {
      return;
    }
    todoGroups = [...todoGroups, name];
    this.setState({ todoGroups });
    store("todoGroups", todoGroups);
  }

  removeTodoGroup(name) {
    let { todoGroups } = this.state;
    let index = todoGroups.indexOf(name);
    if (index !== -1) {
      let todoGroups = [...todoGroups.slice(0, index), ...todoGroups.slice(index + 1)];
      this.setState({ todoGroups });
      store("todoGroups", todoGroups);
    }
  }

  changeActiveGroup(name) {
    this.setState({ activeGroup: name });
    store("activeGroup", name);
  }
}

export default declareStore(TodoGroupStore);
