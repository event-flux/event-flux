import CounterStore from "./CounterStore";

describe("stores", () => {
  describe("CounterStore", () => {
    it("should provide the initial state", () => {
      expect(new CounterStore().state).toEqual({ counter: 0 });
    });

    it("should handle INCREMENT action", () => {
      let counter = new CounterStore();
      counter.increment();
      expect(counter.state).toEqual({ counter: 1 });
    });

    it("should handle DECREMENT action", () => {
      let counter = new CounterStore();
      counter.decrement();
      expect(counter.state).toBe({ counter: -1 });
    });
  });
});
