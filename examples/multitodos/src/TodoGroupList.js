import React from "react";
import ReactDOM from "react-dom";

export default class TodoGroupList extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { showSaveDialog: false, value: "" };
  }

  handleSave = () => {
    this.setState({ showSaveDialog: true });
  };

  handleEnter = () => {
    this.props.onSaveGroup(this.state.value);
    this.setState({ showSaveDialog: false, value: "" });
  };

  handleChange = event => {
    this.setState({ value: event.target.value });
  };

  render() {
    let { todoGroups, activeGroup, onActiveGroup } = this.props;
    return ReactDOM.createPortal(
      <div className="todo-group-list">
        <div className="title">Todo Group List</div>
        <div className="add-btn" onClick={this.handleSave}>
          Add Group
        </div>
        <div className="content">
          {todoGroups.map(name => (
            <div className={activeGroup === name ? "active" : null} key={name} onClick={onActiveGroup.bind(null, name)}>
              {name}
            </div>
          ))}
        </div>
        {this.state.showSaveDialog &&
          ReactDOM.createPortal(
            <div className="dialog">
              <div className="title">Please Input Name</div>
              <div className="inputbox">
                <input className="input" value={this.state.value} onChange={this.handleChange}></input>
              </div>
              <button className="button" onClick={this.handleEnter}>
                OK
              </button>
            </div>,
            document.body
          )}
      </div>,
      document.body
    );
  }
}
