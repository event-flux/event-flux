import {
  AppStore,
  StoreBase,
  declareStore,
  declareStoreList,
  declareStoreMap,
  DispatchParent,
  RecycleStrategy
} from "event-flux";
import * as React from "react";
import { mount, shallow } from "enzyme";
import Provider from "../Provider";
import withEventFlux, {
  transformDefArgs,
  processState,
  StoreDefineObj,
  createStateHandler,
  StoreDefItemWithKey,
  handleFilterState,
  useReqForStore,
  useReqForStoreMap,
  useReqForStoreMapSpread,
  useFilterState,
  genStoreAndState,
  Filter
} from "../withEventFlux";

jest.useFakeTimers();

class TodoStore extends StoreBase<{ state1: string; state2: string }> {
  constructor() {
    super();
    this.state = { state1: "state1", state2: "todo2" };
  }
}

describe("withEventFlux", () => {
  test("transformDefArgs behave correctly", () => {
    let storeDef: StoreDefineObj = {
      store1: ["state1", "state2"],
      store2: ["state3", "state2"]
    };
    expect(transformDefArgs([storeDef])).toEqual([
      { storeKey: "store1", stateFilter: ["state1", "state2"] },
      { storeKey: "store2", stateFilter: ["state3", "state2"] }
    ]);

    expect(transformDefArgs([["store1", ["state1", "state2"]], ["store2", ["state3", "state2"]]])).toEqual([
      { storeKey: "store1", stateFilter: ["state1", "state2"] },
      { storeKey: "store2", stateFilter: ["state3", "state2"] }
    ]);

    const store1Gen = (state: any) => state;
    expect(transformDefArgs([["store1", store1Gen]])).toEqual([{ storeKey: "store1", stateFilter: store1Gen }]);
  });

  test("processState behave correctly", () => {
    expect(processState({ a: 1, b: 2 }, ["a", "b"], "hello")).toEqual({
      a: 1,
      b: 2
    });
    expect(processState({ a: 1, b: 2 }, (state: any) => ({ a: state.a }), "hello")).toEqual({ a: 1 });
    expect(processState({ a: 1, b: { c: 2 } }, ["a", "b.c"], "hello")).toEqual({
      a: 1,
      c: 2
    });
    expect(processState({ a: 1, b: { c: 2 } }, Filter.FA, "hello")).toEqual({
      hello: { a: 1, b: { c: 2 } }
    });
    expect(processState({ a: 1, b: { c: 2 } }, Filter.EA, "hello")).toEqual({
      a: 1,
      b: { c: 2 }
    });
  });

  test("createStateHandler and handleFilterState should behave correctly", () => {
    let defList: StoreDefItemWithKey[] = [
      {
        storeKey: "todo1Store",
        storeType: "Item",
        stateKey: "todo1",
        stateFilter: (state: any) => state
      },
      {
        storeKey: "todo2Store",
        storeType: "List",
        stateKey: "todo2",
        stateFilter: (state: any) => state
      },
      {
        storeKey: "todo3Store",
        storeType: "Map",
        stateKey: "todo3",
        stateFilter: (state: any) => state,
        storeMapFilter: () => ["key1"]
      },
      {
        storeKey: "todo3Store",
        storeType: "Map",
        stateKey: "todo3",
        storeMapKey: "todo3-2",
        as: "todo3Store-2",
        stateFilter: (state: any) => state,
        storeMapFilter: () => ["key1"]
      }
    ];
    let handler = createStateHandler(defList[0]);
    expect(handleFilterState({ todo1: { state1: 1, state2: 2 } }, "todo1", defList[0], handler, null)).toEqual({
      state1: 1,
      state2: 2
    });

    handler = createStateHandler(defList[1]);
    expect(handleFilterState({ todo2: { 0: { state1: 1, state2: 2 } } }, "todo2", defList[1], handler, null)).toEqual({
      todo2: { 0: { state1: 1, state2: 2 } }
    });

    handler = createStateHandler(defList[2]);
    expect(
      handleFilterState(
        { todo3: { key1: { state1: 1, state2: 2 } }, key2: { state1: 10 } },
        "todo3",
        defList[2],
        handler,
        null
      )
    ).toEqual({ todo3: { key1: { state1: 1, state2: 2 } } });

    handler = createStateHandler(defList[3]);
    expect(
      handleFilterState(
        { todo3: { key1: { state1: 1, state2: 2 } }, key2: { state1: 10 } },
        "todo3",
        defList[3],
        handler,
        null
      )
    ).toEqual({ "todo3-2": { key1: { state1: 1, state2: 2 } } });
  });

  test("can get the appStore and stores", () => {
    let appStore = new AppStore();
    appStore.registerStore(declareStore(TodoStore, { stateKey: "todo1", storeKey: "todo1Store" }));
    appStore.init();
    appStore.setRecycleStrategy(RecycleStrategy.Urgent);

    let propInvoker: any[] = [];
    function MyView(props: any) {
      propInvoker.push(props);
      return <div />;
    }
    const MyViewWrap = withEventFlux(["todo1Store", ["state1", "state2"]])(MyView);
    const MyViewWrap2 = withEventFlux(["todo1Store", (state: any) => ({ state1: state.state1, state2: state.state2 })])(
      MyView
    );

    function Fixture() {
      return (
        <Provider appStore={appStore}>
          <div>
            <MyViewWrap />
            <MyViewWrap2 />
          </div>
        </Provider>
      );
    }

    const wrapper = mount(<Fixture />); // mount/render/shallow when applicable
    // let todoStore = new StoreBase(appStore);
    expect(Object.keys(propInvoker[0])).toEqual(["todo1Store", "state1", "state2"]);
    expect(Object.keys(propInvoker[1])).toEqual(["todo1Store", "state1", "state2"]);

    appStore.setState({ todo1: { state1: "hello", state2: "hello" } });
    expect(propInvoker[2]).toBeFalsy();
    jest.runAllTimers();
    expect(Object.keys(propInvoker[2])).toEqual(["todo1Store", "state1", "state2"]);
    expect(propInvoker[2].state1).toBe("hello");

    wrapper.unmount();
    expect(appStore.stores).toEqual({});
  });

  test("can get the appStore and stores for store map", () => {
    let appStore = new AppStore();
    appStore.registerStore(
      declareStoreList(TodoStore, {
        stateKey: "todo2",
        storeKey: "todo2Store",
        size: 1
      })
    );
    appStore.registerStore(
      declareStoreMap(TodoStore, {
        stateKey: "todo3",
        storeKey: "todo3Store",
        keys: ["key1", "key2"]
      })
    );
    appStore.registerStore(declareStoreMap(TodoStore, { stateKey: "todo4", storeKey: "todo4Store" }));
    appStore.init();
    appStore.setRecycleStrategy(RecycleStrategy.Urgent);

    let propInvoker: any[] = [];
    function MyView(props: any) {
      propInvoker.push(props);
      return <div />;
    }
    const MyViewWrap = withEventFlux(["todo2Store", ["state1", "state2"]])(MyView);
    const MyViewWrap2 = withEventFlux(["todo3Store", { filter: ["state1", "state2"] }])(MyView);
    const MyViewWrap3 = withEventFlux([
      "todo3Store",
      { filter: ["state1", "state2"], mapKey: "todo32", as: "todo3Store2" }
    ])(MyView);
    const MyViewWrap4 = withEventFlux(["todo4Store", { filter: ["state1", "state2"], mapFilter: () => ["key1"] }])(
      MyView
    );
    const MyViewWrap5 = withEventFlux(["todo4Store", { filter: ["state1", "state2"], mapSpread: () => "key1" }])(
      MyView
    );

    function Fixture() {
      return (
        <Provider appStore={appStore}>
          <div>
            <MyViewWrap />
            <MyViewWrap2 />
            <MyViewWrap3 />
            <MyViewWrap4 />
            <MyViewWrap5 />
          </div>
        </Provider>
      );
    }

    const wrapper = mount(<Fixture />); // mount/render/shallow when applicable
    // let todoStore = new StoreBase(appStore);
    let storeState = { state1: "state1", state2: "todo2" };
    expect(propInvoker[0]).toEqual({
      todo2Store: appStore.stores.todo2Store,
      todo2: { 0: storeState }
    });
    expect(propInvoker[1]).toEqual({
      todo3Store: appStore.stores.todo3Store,
      todo3: { key1: storeState, key2: storeState }
    });
    expect(propInvoker[2]).toEqual({
      todo3Store2: appStore.stores.todo3Store,
      todo32: { key1: storeState, key2: storeState }
    });
    expect(propInvoker[3]).toEqual({
      todo4Store: appStore.stores.todo4Store,
      todo4: { key1: storeState }
    });
    expect(propInvoker[4]).toEqual({
      _todo4Store: appStore.stores.todo4Store,
      todo4Store: appStore.stores.todo4Store.get("key1"),
      ...storeState
    });
  });

  test("Filter should work as expected", () => {
    let appStore = new AppStore();
    appStore.registerStore(
      declareStoreList(TodoStore, {
        stateKey: "todo2",
        storeKey: "todo2Store",
        size: 1
      })
    );
    appStore.registerStore(
      declareStoreMap(TodoStore, {
        stateKey: "todo3",
        storeKey: "todo3Store",
        keys: ["key1", "key2"]
      })
    );
    appStore.registerStore(declareStoreMap(TodoStore, { stateKey: "todo4", storeKey: "todo4Store" }));
    appStore.init();
    appStore.setRecycleStrategy(RecycleStrategy.Urgent);

    let propInvoker: any[] = [];
    function MyView(props: any) {
      propInvoker.push(props);
      return <div />;
    }
    const MyViewWrap = withEventFlux(["todo2Store", Filter.EA])(MyView);
    const MyViewWrap2 = withEventFlux(["todo3Store", { filter: Filter.FA }])(MyView);
    const MyViewWrap4 = withEventFlux(["todo4Store", { filter: Filter.FA, mapFilter: () => ["key1"] }])(MyView);
    const MyViewWrap5 = withEventFlux(["todo4Store", { filter: Filter.FA, mapSpread: () => "key1" }])(MyView);
    function Fixture() {
      return (
        <Provider appStore={appStore}>
          <div>
            <MyViewWrap />
            <MyViewWrap2 />
            <MyViewWrap4 />
            <MyViewWrap5 />
          </div>
        </Provider>
      );
    }

    const wrapper = mount(<Fixture />); // mount/render/shallow when applicable
    // let todoStore = new StoreBase(appStore);
    let storeState = { state1: "state1", state2: "todo2" };
    expect(propInvoker[0]).toEqual({
      todo2Store: appStore.stores.todo2Store,
      todo2: { 0: storeState }
    });
    expect(propInvoker[1]).toEqual({
      todo3Store: appStore.stores.todo3Store,
      todo3: { key1: { todo3: storeState }, key2: { todo3: storeState } }
    });
    expect(propInvoker[2]).toEqual({
      todo4Store: appStore.stores.todo4Store,
      todo4: { key1: { todo4: storeState } }
    });
    expect(propInvoker[3]).toEqual({
      _todo4Store: appStore.stores.todo4Store,
      todo4Store: appStore.stores.todo4Store.get("key1"),
      todo4: storeState
    });
  });

  test("withEventFlux for store map should create and release store dynamically", () => {
    let appStore = new AppStore();
    appStore.registerStore(declareStoreMap(TodoStore, { stateKey: "todo3", storeKey: "todo3Store" }));
    appStore.init();
    // appStore.setRecycleStrategy(RecycleStrategy.Urgent);

    let propInvoker: any;
    function MyView(props: any) {
      propInvoker = props;
      return <div />;
    }
    const MyViewWrap = withEventFlux(["todo3Store", { filter: ["state1"], mapFilter: (prop: any) => prop.keys }])(
      MyView
    );
    function Fixture(props: any) {
      return (
        <Provider appStore={appStore}>
          <MyViewWrap {...props} />
        </Provider>
      );
    }

    const wrapper = mount(<Fixture keys={["key1"]} />);
    expect(Array.from(appStore.stores.todo3Store.keys())).toEqual(["key1"]);
    expect(appStore.stores.todo3Store._keyRefs["key1"]).toEqual(1);
    expect(propInvoker).toEqual({
      keys: ["key1"],
      todo3Store: appStore.stores.todo3Store,
      todo3: { key1: { state1: "state1" } }
    });

    wrapper.setProps({ keys: ["key1", "key2"] });
    expect(Array.from(appStore.stores.todo3Store.keys())).toEqual(["key1", "key2"]);
    expect(appStore.stores.todo3Store._keyRefs["key1"]).toEqual(1);
    expect(appStore.stores.todo3Store._keyRefs["key2"]).toEqual(1);
    expect(propInvoker).toEqual({
      keys: ["key1", "key2"],
      todo3Store: appStore.stores.todo3Store,
      todo3: { key1: { state1: "state1" }, key2: { state1: "state1" } }
    });

    wrapper.setProps({ keys: ["key2"] });
    appStore.stores.todo3Store._disposeSubStores();
    expect(Array.from(appStore.stores.todo3Store.keys())).toEqual(["key2"]);
    expect(appStore.stores.todo3Store._keyRefs["key2"]).toEqual(1);

    wrapper.unmount();
    appStore.stores.todo3Store._disposeSubStores();
    expect(Array.from(appStore.stores.todo3Store.keys())).toEqual([]);
  });

  test("useReqForStore should get the correct return stores", () => {
    let appStore = new AppStore();
    appStore.registerStore(
      declareStoreList(TodoStore, {
        stateKey: "todo2",
        storeKey: "todo2Store",
        size: 1
      })
    );
    appStore.registerStore(
      declareStoreMap(TodoStore, {
        stateKey: "todo3",
        storeKey: "todo3Store",
        keys: ["key1", "key2"]
      })
    );
    appStore.registerStore(declareStoreMap(TodoStore, { stateKey: "todo4", storeKey: "todo4Store" }));
    appStore.registerStore(declareStoreMap(TodoStore, { stateKey: "todo5", storeKey: "todo5Store" }));
    appStore.init();
    appStore.setRecycleStrategy(RecycleStrategy.Urgent);

    let retStores: any;
    let defList: StoreDefItemWithKey[] | undefined;

    jest.spyOn(appStore, "requestStore");
    jest.spyOn(appStore, "releaseStore");

    function MyView(props: any) {
      defList = transformDefArgs([
        {
          todo2Store: ["state1", "state2"],
          todo3Store: {
            filter: ["state1", "state2"],
            mapKey: "todo32",
            as: "todo3Store2"
          },
          todo4Store: {
            filter: ["state1"],
            mapFilter: () => ["key1"],
            as: "todo4Store2",
            mapKey: "todo42"
          },
          todo5Store: {
            filter: ["state1"],
            mapSpread: () => "key1",
            as: "todo5Store2"
          }
        }
      ]);
      retStores = useReqForStore(defList, appStore);

      return <div />;
    }

    let wrapper = mount(<MyView />);

    let [reqStores, reqStoreMaps, reqStoreMapSpreads] = retStores!;
    expect(reqStores).toEqual({
      todo2Store: appStore.stores.todo2Store,
      todo3Store2: appStore.stores.todo3Store,
      todo4Store2: appStore.stores.todo4Store,
      _todo5Store2: appStore.stores.todo5Store
    });
    expect(defList!.map(item => item.storeType)).toEqual(["List", "Map", "Map", "Map"]);
    expect(reqStoreMaps).toEqual({
      todo4Store: {
        store: appStore.stores.todo4Store,
        storeMapFilter: defList![2].storeMapFilter
      }
    });
    expect(reqStoreMapSpreads).toEqual({
      todo5Store2: {
        store: appStore.stores.todo5Store,
        storeMapSpread: defList![3].storeMapSpread
      }
    });
    expect(appStore.requestStore).toHaveBeenCalledTimes(4);
    expect(appStore.releaseStore).toHaveBeenCalledTimes(0);

    wrapper.setProps({ prop1: "new" });
    expect(appStore.requestStore).toHaveBeenCalledTimes(4);
    expect(appStore.releaseStore).toHaveBeenCalledTimes(0);

    wrapper.unmount();
    expect(appStore.requestStore).toHaveBeenCalledTimes(4);
    expect(appStore.releaseStore).toHaveBeenCalledTimes(4);
    expect(appStore.stores).toEqual({});
  });

  test("useReqForStoreMap should get the correct return stores", () => {
    let appStore = new AppStore();
    appStore.registerStore(declareStoreMap(TodoStore, { stateKey: "todo4", storeKey: "todo4Store" }));
    appStore.registerStore(declareStoreMap(TodoStore, { stateKey: "todo5", storeKey: "todo5Store" }));
    appStore.init();
    // appStore.setRecycleStrategy(RecycleStrategy.Urgent);

    let isStoreChange: boolean = false;
    function MyView(props: any) {
      let defList = transformDefArgs([
        {
          todo4Store: {
            filter: ["state1"],
            mapFilter: props => props.keys,
            as: "todo4Store2",
            mapKey: "todo42"
          }
          // todo5Store: { filter: ["state1" ], mapSpread: props => props, as: "todo5Store2" },
        }
      ]);
      let [retStores, reqStoreMaps] = useReqForStore(defList, appStore);

      jest.spyOn(appStore.stores.todo4Store, "requestStore");
      jest.spyOn(appStore.stores.todo4Store, "releaseStore");
      isStoreChange = useReqForStoreMap(reqStoreMaps, props);
      return <div />;
    }
    let wrapper = mount(<MyView keys={["key1"]} />);

    expect(isStoreChange).toBe(true);
    expect(appStore.stores.todo4Store.requestStore).toHaveBeenCalledTimes(1);
    expect(appStore.stores.todo4Store.releaseStore).toHaveBeenCalledTimes(0);

    wrapper.setProps({ keys: ["key1", "key2"] });
    expect(isStoreChange).toBe(true);
    expect(appStore.stores.todo4Store.requestStore).toHaveBeenCalledTimes(3);
    expect(appStore.stores.todo4Store.releaseStore).toHaveBeenCalledTimes(1);
    expect(appStore.stores.todo4Store._keyRefs["key1"]).toBe(1);

    wrapper.setProps({ keys: ["key1", "key2"] });
    expect(isStoreChange).toBe(false);
    expect(appStore.stores.todo4Store.requestStore).toHaveBeenCalledTimes(3);
    expect(appStore.stores.todo4Store.releaseStore).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    expect(appStore.stores.todo4Store.requestStore).toHaveBeenCalledTimes(3);
    expect(appStore.stores.todo4Store.releaseStore).toHaveBeenCalledTimes(3);
    appStore.stores.todo4Store._disposeSubStores();
    expect(Array.from(appStore.stores.todo4Store.storeMap.keys())).toEqual([]);
  });

  test("useReqForStoreMapSpread should get the correct return stores", () => {
    let appStore = new AppStore();
    appStore.registerStore(declareStoreMap(TodoStore, { stateKey: "todo4", storeKey: "todo4Store" }));
    appStore.registerStore(declareStoreMap(TodoStore, { stateKey: "todo5", storeKey: "todo5Store" }));
    appStore.init();
    // appStore.setRecycleStrategy(RecycleStrategy.Urgent);

    let isStoreChange: boolean = false;
    let retStores;
    function MyView(props: any) {
      let defList = transformDefArgs([
        {
          todo5Store: {
            filter: ["state1"],
            mapSpread: props => props.keys,
            as: "todo5Store2"
          }
        }
      ]);
      let [_retStores, reqStoreMaps, reqStoreMapSpreads] = useReqForStore(defList, appStore);
      retStores = _retStores;

      jest.spyOn(appStore.stores.todo5Store, "requestStore");
      jest.spyOn(appStore.stores.todo5Store, "releaseStore");
      isStoreChange = useReqForStoreMapSpread(reqStoreMapSpreads, props, retStores);
      return <div />;
    }
    let wrapper = mount(<MyView keys={"key1"} />);

    expect(isStoreChange).toBe(true);
    expect(appStore.stores.todo5Store.requestStore).toHaveBeenCalledTimes(1);
    expect(appStore.stores.todo5Store.releaseStore).toHaveBeenCalledTimes(0);
    expect(Array.from(appStore.stores.todo5Store.storeMap.keys())).toEqual(["key1"]);
    expect(retStores).toEqual({
      _todo5Store2: appStore.stores.todo5Store,
      todo5Store2: appStore.stores.todo5Store.get("key1")
    });

    wrapper.setProps({ keys: "key2" });
    expect(isStoreChange).toBe(true);
    expect(appStore.stores.todo5Store.requestStore).toHaveBeenCalledTimes(2);
    expect(appStore.stores.todo5Store.releaseStore).toHaveBeenCalledTimes(1);
    expect(appStore.stores.todo5Store._keyRefs["key2"]).toBe(1);

    wrapper.setProps({ keys: "key2" });
    expect(isStoreChange).toBe(false);
    expect(appStore.stores.todo5Store.requestStore).toHaveBeenCalledTimes(2);
    expect(appStore.stores.todo5Store.releaseStore).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    expect(appStore.stores.todo5Store.requestStore).toHaveBeenCalledTimes(2);
    expect(appStore.stores.todo5Store.releaseStore).toHaveBeenCalledTimes(2);
    appStore.stores.todo5Store._disposeSubStores();
    expect(Array.from(appStore.stores.todo5Store.storeMap.keys())).toEqual([]);
  });

  test("useFilterState should get the correct return state", () => {
    let appStore = new AppStore();
    appStore.registerStore(declareStoreMap(TodoStore, { stateKey: "todo4", storeKey: "todo4Store" }));
    appStore.registerStore(declareStoreMap(TodoStore, { stateKey: "todo5", storeKey: "todo5Store" }));
    appStore.init();

    let retStores;
    let newState;

    function MyView(props: any) {
      [retStores, newState] = genStoreAndState(
        [
          {
            todo4Store: {
              filter: ["state1"],
              mapFilter: props => props.filterKeys,
              as: "todo4Store2",
              mapKey: "todo4_"
            },
            todo5Store: {
              filter: ["state1"],
              mapSpread: props => props.spreadKey,
              as: "todo5Store2"
            }
          }
        ],
        props
      );
      return <div />;
    }

    function Fixture(props: any) {
      return (
        <Provider appStore={appStore}>
          <MyView {...props} />
        </Provider>
      );
    }

    const wrapper = mount(<Fixture filterKeys={["key1", "key2"]} spreadKey="key1" />);
    expect(newState).toEqual({
      todo4_: { key1: { state1: "state1" }, key2: { state1: "state1" } },
      state1: "state1"
    });

    appStore.setState({ todo5: { key1: { state1: "hello" } } });
    wrapper.setProps({ filterKeys: ["key1"], spreadKey: "key1" });
    expect(newState).toEqual({
      todo4_: { key1: { state1: "state1" } },
      state1: "hello"
    });
    jest.runAllTimers();

    appStore.setState({ todo5: { key1: { state1: "world" } } });
    wrapper.setProps({ filterKeys: ["key1"], spreadKey: "key1" });
    expect(newState).toEqual({
      todo4_: { key1: { state1: "state1" } },
      state1: "hello"
    });
    jest.runAllTimers();
    expect(newState).toEqual({
      todo4_: { key1: { state1: "state1" } },
      state1: "world"
    });
  });

  test("with Class Component and ref", () => {
    let appStore = new AppStore();
    appStore.registerStore(declareStore(TodoStore, { stateKey: "todo1", storeKey: "todo1Store" }));
    appStore.init();
    appStore.setRecycleStrategy(RecycleStrategy.Urgent);

    class MyView extends React.PureComponent<any> {
      doAny() {}

      render() {
        return <div />;
      }
    }
    const MyViewWrap = withEventFlux(["todo1Store", ["state1", "state2"]])(MyView);

    class MyComponent extends React.PureComponent<any> {
      render() {
        return <MyViewWrap ref={this.props.innerRef} />;
      }
    }

    function Fixture(props: any) {
      return (
        <Provider appStore={appStore}>
          <MyComponent innerRef={props.innerRef} />
        </Provider>
      );
    }

    let viewRef: any;
    let withRef = (ref: any) => (viewRef = ref);
    const wrapper = mount(<Fixture innerRef={withRef} />);
    expect(viewRef.doAny).toBeTruthy();
  });
});
