import { StoreBase } from "event-flux";

export default class CounterStore extends StoreBase {
  constructor() {
    this.state = { counter: 0 };
  }

  increment() {
    this.setState({ counter: this.state.counter + 1 });
  }

  decrement() {
    this.setState({ counter: this.state.counter - 1 });
  }
}
