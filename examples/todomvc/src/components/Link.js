import React from "react";
import PropTypes from "prop-types";
import classnames from "classnames";

const Link = ({ filter, activeFilter, children, todoStore }) => (
  // eslint-disable-next-line jsx-a11y/anchor-is-valid
  <a
    className={classnames({ selected: filter === activeFilter })}
    style={{ cursor: "pointer" }}
    onClick={() => todoStore.setFilter(filter)}
  >
    {children}
  </a>
);

Link.propTypes = {
  filter: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  todoStore: PropTypes.object.isRequired
};

export default Link;
