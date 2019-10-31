import React from "react";
import PropTypes from "prop-types";
import TodoItem from "./TodoItem";
import {
  SHOW_ALL,
  SHOW_COMPLETED,
  SHOW_ACTIVE
} from "../constants/TodoFilters";

const TodoList = ({ filter, todos, todoStore }) => {
  let filteredTodos;
  switch (filter) {
    case SHOW_ALL:
      filteredTodos = todos;
      break;
    case SHOW_COMPLETED:
      filteredTodos = todos.filter(t => t.completed);
      break;
    case SHOW_ACTIVE:
      filteredTodos = todos.filter(t => !t.completed);
      break;
    default:
      filteredTodos = todos;
  }
  return (
    <ul className="todo-list">
      {filteredTodos.map(todo => (
        <TodoItem key={todo.id} todo={todo} todoStore={todoStore} />
      ))}
    </ul>
  );
};

TodoList.propTypes = {
  todos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      completed: PropTypes.bool.isRequired,
      title: PropTypes.string
    }).isRequired
  ).isRequired,
  todoStore: PropTypes.object.isRequired
};

export default TodoList;
