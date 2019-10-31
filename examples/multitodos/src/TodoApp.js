import React from "react";
import { withEventFlux } from "react-event-flux";
import TodoGroupList from "./TodoGroupList";
import TodoEditor from "./TodoEditor";

class TodoApp extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  handleSaveGroup = name => {
    this.props.todoGroupStore.addTodoGroup(name);
  };

  handleActiveGroup = name => {
    this.props.todoGroupStore.changeActiveGroup(name);
  };

  render() {
    let { activeGroup } = this.props;
    return (
      <React.Fragment>
        <TodoGroupList {...this.props} onActiveGroup={this.handleActiveGroup} onSaveGroup={this.handleSaveGroup} />
        <TodoEditor activeGroup={activeGroup} onSaveGroup={this.handleSaveGroup} />
      </React.Fragment>
    );
  }
}

export default withEventFlux({
  todoGroupStore: ["todoGroups", "activeGroup"]
})(TodoApp);
