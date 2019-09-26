import AppStore  from '../AppStore';
import StoreBase from '../StoreBase';
import { declareStore } from '../StoreDeclarer';
import RecycleStrategy from '../RecycleStrategy';
import DispatchParent from '../DispatchParent';

class TodoStore extends StoreBase<{ todo2: string }> {
  constructor(appStore: DispatchParent) {
    super(appStore);
    this.state = { todo2: 'todo2' };
  }
}

jest.useFakeTimers();

describe('AppStore', () => {
  
  test('can observe store state change', () => {
    let appStore = new AppStore();
    let todo2Store = new TodoStore(appStore)
    appStore.stores = { todo2Store };
    todo2Store.observe((state) => appStore.setState({ todo2: state }));
    expect(appStore.state.todo2).toEqual({ todo2: 'todo2' });
    appStore.init();

    todo2Store.setState({ todo2: 'todo3' });
    jest.runAllTimers();
    
    expect(appStore.state).toEqual({ todo2: { todo2: 'todo3' } });
  });

  test('should invoke onChange', () => {
    let onChange = jest.fn();
    let appStore = new AppStore();
    appStore.onDidChange(onChange);
    appStore.handleWillChange = jest.fn();

    let todo2Store = new TodoStore(appStore); 
    todo2Store.observe((state) => appStore.setState({ todo2: state }));
    appStore.stores = { todo2Store };
    let prevState = appStore.state;
    expect(prevState).toEqual({ todo2: { todo2: 'todo2' } });
    appStore.init();

    (appStore.stores.todo2Store as StoreBase<any>).setState({ todo2: 'todo3' });
    appStore.setState({ 'hello': 'ddd' });

    jest.runAllTimers();
    expect(appStore.handleWillChange).toHaveBeenCalledTimes(1);
    expect(appStore.handleWillChange).toHaveBeenCalledWith(prevState, { todo2: { todo2: 'todo3' }, hello: 'ddd' });
    expect(onChange).toHaveBeenCalledWith({ hello: 'ddd', todo2: { todo2: 'todo3' } });

    appStore.setState({ 'hello': 'world' });
    jest.runAllTimers();

    expect(appStore.handleWillChange).toHaveBeenCalledWith(
      { hello: 'ddd', todo2: { todo2: 'todo3' } }, 
      { hello: 'world', todo2: { todo2: 'todo3' } }
    );
    expect(onChange).toHaveBeenCalledWith({ hello: 'world', todo2: { todo2: 'todo3' } });
  });

  test("should register store declarer", () => {
    let appStore = new AppStore();
    appStore.registerStore(declareStore(StoreBase), declareStore(TodoStore));

    expect(appStore._storeRegisterMap["storeBaseStore"].Store).toEqual(StoreBase);
    expect(appStore._storeRegisterMap["todoStore"].Store).toEqual(TodoStore);
  });

  test("constructor and registerStore should register store declarer", () => {
    let appStore = new AppStore([declareStore(StoreBase)]);
    appStore.registerStore(declareStore(TodoStore));

    expect(appStore._storeRegisterMap["storeBaseStore"].Store).toEqual(StoreBase);
    expect(appStore._storeRegisterMap["todoStore"].Store).toEqual(TodoStore);
  });

  test("should request store for dependency store dependen on self", () => {
    class Todo1Store extends StoreBase<any> {}
    class Todo2Store extends StoreBase<any> {}
    class Todo3Store extends StoreBase<any> {}

    let appStore = new AppStore();
    appStore.registerStore(declareStore(Todo1Store, ["todo2Store", "todo3Store"]));
    appStore.registerStore(declareStore(Todo2Store, ["todo1Store", "todo4"]));
    appStore.registerStore(declareStore(Todo3Store));

    appStore.setRecycleStrategy(RecycleStrategy.Urgent);
    appStore.init();

    expect(appStore.stores).toEqual({});
    appStore.requestStore("todo3Store");
    expect(appStore.stores.todo3Store.getRefCount()).toEqual(1);

    appStore.requestStore("todo1Store");
    expect(Object.keys(appStore.stores).sort()).toEqual(["todo1Store", "todo2Store", "todo3Store"]);
    expect(appStore.stores.todo1Store.getRefCount()).toEqual(1);
    expect(appStore.stores.todo2Store.getRefCount()).toEqual(1);
    expect(appStore.stores.todo3Store.getRefCount()).toEqual(2);

    appStore.requestStore("todo1Store");
    expect(appStore.stores.todo1Store.getRefCount()).toEqual(2);

    appStore.releaseStore("todo1Store");
    expect(appStore.stores.todo1Store.getRefCount()).toEqual(1);

    appStore.releaseStore("todo1Store");
    expect(appStore.stores.todo1Store).toBeFalsy();
    expect(appStore.stores.todo2Store).toBeFalsy();

    expect(appStore.stores.todo3Store.getRefCount()).toEqual(1);
    appStore.releaseStore("todo3Store");
    expect(appStore.stores.todo3Store).toBeFalsy();
  });

  test("should relase store with circular dependency stores", () => {
    class Todo1Store extends StoreBase<any> {}
    class Todo2Store extends StoreBase<any> {}
    class Todo3Store extends StoreBase<any> {}

    let appStore = new AppStore();
    appStore.registerStore(declareStore(Todo1Store, ["todo2Store", "todo3Store"]));
    appStore.registerStore(declareStore(Todo2Store, ["todo1Store", "todo4"]));
    appStore.registerStore(declareStore(Todo3Store));

    appStore.setRecycleStrategy(RecycleStrategy.Urgent);
    appStore.init();

    appStore.requestStore("todo1Store");
    expect(Object.keys(appStore.stores).sort()).toEqual(["todo1Store", "todo2Store", "todo3Store"]);
    expect(appStore.stores.todo1Store.getRefCount()).toEqual(1);
    expect(appStore.stores.todo2Store.getRefCount()).toEqual(1);
    expect(appStore.stores.todo3Store.getRefCount()).toEqual(1);

    appStore.requestStore("todo2Store");
    expect(appStore.stores.todo2Store.getRefCount()).toEqual(2);

    appStore.releaseStore("todo1Store");
    expect(appStore.stores.todo1Store.getRefCount()).toEqual(1);
    expect(appStore.stores.todo2Store.getRefCount()).toEqual(1);
    expect(appStore.stores.todo3Store.getRefCount()).toEqual(1);

    appStore.releaseStore("todo1Store");
    expect(appStore.stores.todo1Store).toBeFalsy();
    expect(appStore.stores.todo2Store).toBeFalsy();
    expect(appStore.stores.todo3Store).toBeFalsy();
  });

  test("should request store and init store", () => {
    class Todo1Store extends StoreBase<any> {}
    class Todo2Store extends StoreBase<any> {}
    class Todo3Store extends StoreBase<any> {}

    let appStore = new AppStore({ todo3: { hello: "world" } });
    appStore.registerStore(declareStore(Todo1Store, ["todo2Store", "todo3Store"]));
    appStore.registerStore(declareStore(Todo2Store, ["todo1Store"]));
    appStore.registerStore(declareStore(Todo3Store, { args: "myArg" }));

    appStore.init();

    Todo3Store.prototype.init = jest.fn();

    appStore.requestStore("todo3Store");
    expect((appStore.stores.todo3Store as StoreBase<any>)._args).toBe("myArg");
    expect((appStore.stores.todo3Store as StoreBase<any>)._stateKey).toBe("todo3");
    expect((appStore.stores.todo3Store as StoreBase<any>).state).toEqual({ hello: "world" });
    expect((appStore.stores.todo3Store as StoreBase<any>).init).toHaveBeenCalled();

    appStore.requestStore("todo1Store");
    expect((appStore.stores.todo1Store as StoreBase<any>)._args).toBe(undefined);
    expect((appStore.stores.todo1Store as StoreBase<any>)._stateKey).toBe("todo1");
    expect((appStore.stores.todo1Store as StoreBase<any>).state).toEqual({});
    expect((appStore.stores.todo3Store as StoreBase<any>).init).toHaveBeenCalled();
    expect(appStore.state).toEqual({ todo3: { hello: "world" }, todo1: {}, todo2: {} });
  });

  test("should can preload stores ahead of time", () => {
    class Todo1Store extends StoreBase<any> {}
    class Todo2Store extends StoreBase<any> {}
    class Todo3Store extends StoreBase<any> {}

    let appStore = new AppStore({ todo3: { hello: "world" } });
    appStore.registerStore(
      declareStore(Todo1Store, ["todo2Store", "todo3Store"]),
      declareStore(Todo2Store, ["todo1Store"]),
      declareStore(Todo3Store, { args: "myArg" })
    );

    Todo1Store.prototype.init = jest.fn();
    Todo2Store.prototype.init = jest.fn();
    Todo3Store.prototype.init = jest.fn();

    appStore.preloadStores(["todo3Store", "todo1Store", "todo2Store", ]);
    expect(appStore.stores.todo1Store.getRefCount()).toBe(0);
    expect(appStore.stores.todo2Store.getRefCount()).toBe(1);
    expect(appStore.stores.todo3Store.getRefCount()).toBe(1);

    expect((appStore.stores.todo1Store as StoreBase<any>).init).toHaveBeenCalledTimes(1);
    expect((appStore.stores.todo2Store as StoreBase<any>).init).toHaveBeenCalledTimes(1);
    expect((appStore.stores.todo3Store as StoreBase<any>).init).toHaveBeenCalledTimes(1);
  });

  test("setRecycleStrategy to urgent should dispose not used stores", () => {
    class Todo1Store extends StoreBase<any> {}
    class Todo2Store extends StoreBase<any> {}
    class Todo3Store extends StoreBase<any> {}

    let appStore = new AppStore({ todo3: { hello: "world" } });
    appStore.registerStore(
      declareStore(Todo1Store, ["todo2Store", "todo3Store"]),
      declareStore(Todo2Store, ["todo1Store"]),
      declareStore(Todo3Store, { args: "myArg" })
    );
    appStore.preloadStores(["todo3Store", "todo1Store", "todo2Store", ]);
    
    appStore.setRecycleStrategy(RecycleStrategy.Urgent);
    expect(appStore.stores).toEqual({});
  });

  test("should transfer storeOpts to _createStore and _deleteStore", () => {
    let appStore = new AppStore([declareStore(StoreBase, [], { storeKey: "helloStore" })]);
    appStore.setRecycleStrategy(RecycleStrategy.Urgent);
    appStore.init();

    appStore._createStore = jest.spyOn(appStore, "_createStore") as any;
    appStore._deleteStore = jest.spyOn(appStore, "_deleteStore") as any;
    appStore.requestStore("helloStore", { client: "string" });
    expect(appStore._createStore).toHaveBeenLastCalledWith("helloStore", appStore.stores["helloStore"], { client: "string" });

    appStore.releaseStore("helloStore", { client: "string" });
    expect(appStore._deleteStore).toHaveBeenLastCalledWith("helloStore", { client: "string" });
  });
  
  test("should transfer storeOpts to _getStoreKey and _getStateKey", () => {
    let appStore = new AppStore([declareStore(StoreBase, [], { storeKey: "helloStore", stateKey: "hello" })]);
    appStore.setRecycleStrategy(RecycleStrategy.Urgent);
    appStore.init();

    appStore._getStoreKey = jest.spyOn(appStore, "_getStoreKey") as any;
    appStore._getStateKey = jest.spyOn(appStore, "_getStateKey") as any;
    appStore.requestStore("helloStore", { client: "string" });
    expect(appStore._getStoreKey).toHaveBeenLastCalledWith("helloStore", { client: "string" });
    expect(appStore._getStateKey).toHaveBeenLastCalledWith("hello", { client: "string" });

    (appStore._getStoreKey as any).mockReset();
    appStore.releaseStore("helloStore", { client: "string" });
    expect(appStore._getStoreKey).toHaveBeenLastCalledWith("helloStore", { client: "string" });
  });

  test("should can customize the store key and the state key", () => {
    class MyAppStore extends AppStore {
      _getStoreKey(storeKey: string, storeOpts?: any) {
        return storeOpts ? storeKey + "@" + storeOpts : storeKey;
      }

      _parseStoreKey(finalStoreKey: string): [string, any] {
        let [storeKey, opts] = finalStoreKey.split("@");
        return [storeKey, opts];
      }

      _getStateKey(stateKey: string, storeOpts?: any) {
        return storeOpts ? stateKey + "@" + storeOpts : stateKey;
      }
    }

    let appStore = new MyAppStore([
      declareStore(StoreBase, ["todo2Store"], { storeKey: "todo1Store", stateKey: "todo1" }),
      declareStore(StoreBase, ["todo1Store"], { storeKey: "todo2Store", stateKey: "todo2" })
    ]);
    // appStore.setRecycleStrategy(RecycleStrategy.Urgent);
    appStore.init();

    appStore.requestStore("todo1Store", "hello");
    expect(Object.keys(appStore.stores).sort()).toEqual(["todo1Store@hello", "todo2Store@hello"]);
    expect(Object.keys(appStore.state).sort()).toEqual(["todo1@hello", "todo2@hello"]);

    expect(appStore.stores["todo1Store@hello"]._stateKey).toEqual("todo1@hello");
    expect((appStore.stores["todo1Store@hello"] as StoreBase<any>)["todo2Store"]).toEqual(appStore.stores["todo2Store@hello"]);

    expect(appStore.stores["todo2Store@hello"]._stateKey).toEqual("todo2@hello");
    expect((appStore.stores["todo2Store@hello"] as StoreBase<any>)["todo1Store"]).toEqual(appStore.stores["todo1Store@hello"]);

    appStore.releaseStore("todo1Store", "hello");
    expect(appStore.stores["todo1Store@hello"].getRefCount()).toBe(0);
    // expect(appStore.stores["todo2Store@hello"].getRefCount()).toBe(0);

    appStore.setRecycleStrategy(RecycleStrategy.Urgent);
    expect(Object.keys(appStore.stores)).toEqual([]);
  });
});
