import React from "react";
import PropTypes from "prop-types";
import Footer from "./Footer";
import VisibleTodoList from "../containers/VisibleTodoList";
import TodoStore from "../stores/TodoStore";

const MainSection = ({ todos, todoStore }) => {
  let completedCount = todos.reduce(
    (count, todo) => (todo.completed ? count + 1 : count),
    0
  );
  let todosCount = todos.length;
  return (
    <section className="main">
      {!!todosCount && (
        <span>
          <input
            className="toggle-all"
            type="checkbox"
            checked={completedCount === todosCount}
            readOnly
          />
          <label onClick={() => todoStore.toggleAll()} />
        </span>
      )}
      <VisibleTodoList />
      {!!todosCount && (
        <Footer
          completedCount={completedCount}
          activeCount={todosCount - completedCount}
          onClearCompleted={() => todoStore.clearCompleted()}
        />
      )}
    </section>
  );
};

MainSection.propTypes = {
  todos: PropTypes.array.isRequired
};

export default MainSection;
