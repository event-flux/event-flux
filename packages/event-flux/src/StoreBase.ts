import { Emitter, Disposable, CompositeDisposable, DisposableLike } from "event-kit";
import DispatchParent from "./DispatchParent";
import DispatchItem from "./DispatchItem";
import { StoreBaseConstructor, StoreMapDeclarer, StoreDeclarerOptions } from "./StoreDeclarer";

const IS_STORE = "@@__FLUX_STORE__@@";

export function eventListener(target: StoreBase<any>, propertyKey: string, descriptor: PropertyDescriptor) {
  if (!target._evs) {
    target._evs = [];
  }
  target._evs.push(propertyKey);
  return target[propertyKey];
}

export function reducer(target: StoreBase<any>, propertyKey: string, descriptor: PropertyDescriptor) {
  let originalMethod = descriptor.value;

  descriptor.value = function(this: StoreBase<any>, ...args: any[]) {
    this._disableUpdate();
    let retVal = originalMethod.apply(this, args);
    if (retVal && retVal.finally) {
      retVal.finally(this._enableUpdate);
    } else {
      this._enableUpdate();
    }
  };
}

export function invoker(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  let originalMethod = descriptor.value;
  if (!target._invokers) {
    target._invokers = [];
  }
  target._invokers.push(propertyKey);

  descriptor.value = function(this: StoreBase<any>, ...args: any[]) {
    this._disableUpdate();
    let retVal = originalMethod.apply(this, args);
    if (retVal && retVal.finally) {
      return retVal.finally(this._enableUpdate);
    } else {
      this._enableUpdate();
      return retVal;
    }
  };
}

export default class StoreBase<StateT> implements DispatchItem {
  state: StateT = {} as StateT;

  emitter = new Emitter();
  disposables = new CompositeDisposable();

  _inWillUpdate = false;
  _willUpdateStates: any[] = [];

  _appStore: DispatchParent | undefined;
  _stateKey: string | undefined;

  _refCount = 0;
  __enableUpdate: boolean = true;
  _hasUpdate = false;

  mapKey?: string;
  listIndex?: number;

  [storeKey: string]: any;

  static isStore: (store: any) => boolean;
  // static innerStores;

  /**
   * Inject the store's dependency stores into this store, It will be invoked before init
   * @param depStores: the store's dependencies, the dependency stores will be injected to this store
   */
  _inject(
    appStore: DispatchParent | undefined,
    StoreBuilder: StoreBaseConstructor<any>,
    stateKey?: string,
    depStores?: { [storeKey: string]: DispatchItem },
    initState?: any,
    options?: StoreDeclarerOptions
  ) {
    this._appStore = appStore;
    this._stateKey = stateKey;
    if (depStores) {
      for (let storeKey in depStores) {
        this[storeKey] = depStores[storeKey];
      }
    }

    // Observe this store's state and send the state to appStore
    if (initState) {
      this.state = initState;
      this.addDisposable(this.onDidUpdate(this._handleUpdate));
    } else {
      this.addDisposable(this.observe(this._handleUpdate));
    }
  }

  _handleUpdate = (state: any) => {
    let stateKey = this._stateKey;
    if (!this._appStore) return;
    if (stateKey) {
      this._appStore.setState({ [stateKey]: state });
    } else {
      this._appStore.setState(state);
    }
  };

  _init(): any | Promise<any> {
    // Before init, we will disable update
    this._disableUpdate();
    let retVal = this.init();
    // Check the return value is Promise-like or not
    if (retVal && retVal.finally) {
      return retVal.finally(this._enableUpdate);
    } else {
      this._enableUpdate();
    }
  }

  init(): any | Promise<any> {}

  _disableUpdate() {
    this.__enableUpdate = false;
  }

  _enableUpdate = () => {
    this.__enableUpdate = true;
    if (this._hasUpdate) {
      this._hasUpdate = false;
      this.emitter.emit("did-update", this.state);
    }
  };

  setState(state: any) {
    // 当will-update，将状态保存到缓存队列中
    if (this._inWillUpdate) {
      this._willUpdateStates.push(state);
      return;
    }
    // Make the update delay to next tick that can collect many update into one operation.
    let nextState = Object.assign({}, this.state, state);
    this._inWillUpdate = true;
    this.emitter.emit("will-update", nextState);
    this._inWillUpdate = false;
    if (this._willUpdateStates.length > 0) {
      this.state = this._willUpdateStates.reduce((allState, state) => Object.assign(allState, state), nextState);
      this._willUpdateStates = [];
    } else {
      this.state = nextState;
    }

    // Send update notification.
    if (this.__enableUpdate) {
      this.emitter.emit("did-update", this.state);
    } else {
      this._hasUpdate = true;
    }
  }

  @eventListener
  onDidUpdate(callback: (value: StateT) => void): Disposable {
    return this.emitter.on("did-update", callback);
  }

  @eventListener
  onWillUpdate(callback: (value: StateT) => void) {
    return this.emitter.on("will-update", callback);
  }

  @eventListener
  observe(callback: (value: StateT) => void) {
    callback(this.state);
    return this.emitter.on("did-update", callback);
  }

  addDisposable(item: DisposableLike) {
    this.disposables.add(item);
  }

  dispose() {
    this.disposables.dispose();
    this.emitter.dispose();
    this._handleUpdate(undefined);
  }

  getState() {
    return this.state;
  }

  // Add the ref count and avoid recycle this store
  _addRef() {
    this._refCount += 1;
  }

  // Decrease the store's ref count, if this ref count decrease to 0, this store  will be disposed.
  _decreaseRef() {
    this._refCount -= 1;
  }

  getRefCount() {
    return this._refCount;
  }
}

(StoreBase.prototype as any)[IS_STORE] = true;
StoreBase.isStore = function(maybeStore: any) {
  return !!(maybeStore && maybeStore[IS_STORE]);
};
