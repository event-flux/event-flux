import React, { Component } from "react";
import PropTypes from "prop-types";
import { withEventFlux, Filter } from "react-event-flux";

class Counter extends Component {
  constructor(props) {
    super(props);
    this.increment = this.increment.bind(this);
    this.decrement = this.decrement.bind(this);
    this.incrementAsync = this.incrementAsync.bind(this);
    this.incrementIfOdd = this.incrementIfOdd.bind(this);
  }

  increment() {
    this.props.counterStore.increment();
  }

  decrement() {
    this.props.counterStore.decrement();
  }

  incrementIfOdd() {
    if (this.props.counter % 2 !== 0) {
      this.props.counterStore.increment();
    }
  }

  incrementAsync() {
    setTimeout(() => this.props.counterStore.increment(), 1000);
  }

  render() {
    const { counter } = this.props;
    return (
      <p>
        Clicked: {counter} times <button onClick={this.increment}>+</button> <button onClick={this.decrement}>-</button>{" "}
        <button onClick={this.incrementIfOdd}>Increment if odd</button>{" "}
        <button onClick={this.incrementAsync}>Increment async</button>
      </p>
    );
  }
}

Counter.propTypes = {
  counter: PropTypes.number.isRequired,
  counterStore: PropTypes.object.isRequired
};

export default withEventFlux({ counterStore: Filter.EA })(Counter);
