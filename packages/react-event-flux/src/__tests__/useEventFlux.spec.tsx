import { AppStore, StoreBase, DispatchParent, RecycleStrategy, declareStore } from "event-flux";
import * as React from "react";
import { mount, shallow } from "enzyme";
import Provider from "../Provider";
import useEventFlux from "../useEventFlux";

jest.useFakeTimers();

class TodoStore extends StoreBase<{ state1: string; state2: string }> {
  constructor() {
    super();
    this.state = { state1: "state1", state2: "todo2" };
  }
}

describe("useEventFlux", () => {
  test("can get the appStore and stores", () => {
    let appStore = new AppStore();
    appStore.registerStore(declareStore(TodoStore, { stateKey: "todo1", storeKey: "todo1Store" }));
    appStore.registerStore(declareStore(TodoStore, { stateKey: "todo12", storeKey: "todo2Store" }));
    appStore.init();
    appStore.setRecycleStrategy(RecycleStrategy.Urgent);

    let propInvoker: any[] = [];
    function MyView(props: any) {
      let todo1Props = useEventFlux(["todo1Store", ["state1", "state2"]], props);
      expect(Object.keys(todo1Props)).toEqual(["todo1Store", "state1", "state2"]);

      let todo2Props = useEventFlux({ todo2Store: ["state1", "state2"] }, props);
      expect(Object.keys(todo2Props)).toEqual(["todo2Store", "state1", "state2"]);

      let todo3Props = useEventFlux({ todo2Store: ({ state1 }: any) => ({ state1 }) }, props);
      expect(Object.keys(todo3Props)).toEqual(["todo2Store", "state1"]);

      return <div />;
    }

    function Fixture() {
      return (
        <Provider appStore={appStore}>
          <MyView />
        </Provider>
      );
    }

    const wrapper = mount(<Fixture />); // mount/render/shallow when applicable

    wrapper.unmount();
    expect(appStore.stores).toEqual({});
  });
});
