import React, { Component } from "react";
import PropTypes from "prop-types";
import classnames from "classnames";
import TodoTextInput from "./TodoTextInput";

export default class TodoItem extends Component {
  static propTypes = {
    todo: PropTypes.object.isRequired
  };

  state = {
    editing: false
  };

  handleDoubleClick = () => {
    this.setState({ editing: true });
  };

  handleSave = (todo, text) => {
    if (text.length === 0) {
      this.props.todoStore.destroy(todo);
    } else {
      this.props.todoStore.save(todo, text);
    }
    this.setState({ editing: false });
  };

  handleEditTodo(id, text) {
    this.props.todoStore.save(id, text);
  }

  handleDeleteTodo(todo) {
    this.props.todoStore.destroy(todo);
  }

  handleCompleteTodo(todo) {
    this.props.todoStore.toggle(todo);
  }

  render() {
    const { todo, completeTodo, deleteTodo } = this.props;

    let element;
    if (this.state.editing) {
      element = (
        <TodoTextInput
          text={todo.title}
          editing={this.state.editing}
          onSave={text => this.handleSave(todo, text)}
        />
      );
    } else {
      element = (
        <div className="view">
          <input
            className="toggle"
            type="checkbox"
            checked={todo.completed}
            onChange={() => this.handleCompleteTodo(todo)}
          />
          <label onDoubleClick={this.handleDoubleClick}>{todo.title}</label>
          <button
            className="destroy"
            onClick={() => this.handleDeleteTodo(todo)}
          />
        </div>
      );
    }

    return (
      <li
        className={classnames({
          completed: todo.completed,
          editing: this.state.editing
        })}
      >
        {element}
      </li>
    );
  }
}
