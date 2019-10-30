import { StoreMapDeclarerOptions, StoreBaseConstructor, StoreMapDeclarer } from "./StoreDeclarer";
import DispatchItem from "./DispatchItem";
import DispatchParent from "./DispatchParent";
import { DisposableLike, CompositeDisposable, Emitter } from "event-kit";
import { RecycleStrategy, AppStore } from ".";
import LRU from "./LRU";

export enum OperateMode {
  None,
  Direct,
  RefCount
}

export class OperateModeSwitch {
  operateMode: OperateMode = OperateMode.None;

  enterRefCountMode() {
    if (this.operateMode === OperateMode.Direct) {
      throw new Error(`
        You request store that use direct mode, so requesting store by "request" method is not allowed. 
        Try to remove all the "add" invocation and "keys" declarer options.
      `);
    }
    this.operateMode = OperateMode.RefCount;
  }

  enterDirectMode() {
    if (this.operateMode === OperateMode.RefCount) {
      throw new Error(
        `You request store that use reference count, so requesting store by "add" and "delete" is not allowed.`
      );
    }
    this.operateMode = OperateMode.Direct;
  }
}

export default class StoreMap<T> implements DispatchItem {
  storeMap: Map<string, any> = new Map();

  _options: StoreMapDeclarerOptions | undefined;
  _StoreBuilder: StoreBaseConstructor<T> | undefined;
  _depStores: { [storeKey: string]: DispatchItem } = {};
  _stateKey: string | undefined;

  _recycleStrategy: RecycleStrategy | undefined;
  _keyCache: LRU<string> | undefined;

  _appStore: DispatchParent | undefined;
  _refCount = 0;

  emitter = new Emitter();

  __initStates__: any;
  state: any = {};

  _keyRefs: { [key: string]: number } = {};

  disposables = new CompositeDisposable();
  operateModeSwitch = new OperateModeSwitch();

  _init() {
    let keys = this._options!.keys;
    if (keys && Array.isArray(keys)) {
      return Promise.all([...keys.map(key => this.add(key)), this.init()]);
    }
    return this.init();
  }

  init() {}

  _inject(
    appStore: DispatchParent | undefined,
    StoreBuilder: StoreBaseConstructor<T>,
    stateKey?: string,
    depStores?: { [storeKey: string]: DispatchItem },
    initState?: any,
    options?: StoreMapDeclarerOptions
  ) {
    this._appStore = appStore;
    this._stateKey = stateKey;
    if (!stateKey) console.error("StoreList can not let stateKey to null");

    this._StoreBuilder = StoreBuilder;
    this._options = options!;

    if (depStores) {
      this._depStores = depStores;
    }
    if (initState) {
      this.__initStates__ = initState;
      this.state = initState;
    }
    if (options && options.recycleStrategy != null) {
      this.setRecycleStrategy(options.recycleStrategy, { cacheLimit: options.cacheLimit });
    }
  }

  // Dispose all the sub stores that reference count is 0
  _disposeSubStores() {
    let keyRefs = this._keyRefs;
    for (let storeKey in keyRefs) {
      if (keyRefs[storeKey] === 0 && this.storeMap.has(storeKey)) {
        this._deleteOne(storeKey);
      }
    }
  }

  onDidChangeRS(callback: (recycleStrategy: RecycleStrategy) => void) {
    return this.emitter.on("did-change-rs", callback);
  }

  observeRS(callback: (recycleStrategy: RecycleStrategy) => void) {
    if (this._recycleStrategy != null) {
      callback(this._recycleStrategy);
    }
    return this.onDidChangeRS(callback);
  }

  setRecycleStrategy(recycleStrategy: RecycleStrategy, options?: { cacheLimit: number | undefined }) {
    if (this._recycleStrategy !== recycleStrategy) {
      this._recycleStrategy = recycleStrategy;
      this._keyCache = undefined;
      if (recycleStrategy === RecycleStrategy.Urgent) {
        this._disposeSubStores();
      } else if (recycleStrategy === RecycleStrategy.Cache) {
        this._keyCache = new LRU(options && options.cacheLimit, (removeKey: string) => {
          this._deleteOne(removeKey);
        });
      }
      this.emitter.emit("did-change-rs", recycleStrategy);
    }
  }

  setInitStates(initStates: any) {
    this.__initStates__ = initStates;
  }

  requestStore(storeKey: string) {
    this.operateModeSwitch.enterRefCountMode();

    if (this._keyRefs[storeKey]) {
      this._keyRefs[storeKey] += 1;
    } else {
      this._keyRefs[storeKey] = 1;

      // If the cache has not this key, then we need create the new store.
      if (!this._keyCache || !this._keyCache.take(storeKey)) {
        this._addOne(storeKey);
      }
    }
  }

  releaseStore(storeKey: string) {
    this._keyRefs[storeKey] -= 1;
    if (this._keyRefs[storeKey] === 0) {
      if (
        this._recycleStrategy === undefined &&
        (this._appStore as AppStore)._recycleStrategy === RecycleStrategy.Urgent
      ) {
        this._deleteOne(storeKey);
      } else if (this._recycleStrategy === RecycleStrategy.Urgent) {
        this._deleteOne(storeKey);
      } else if (this._recycleStrategy === RecycleStrategy.Cache) {
        this._keyCache!.put(storeKey, storeKey);
      }
    }
  }

  // Request the store that storeKey is `keys`, use the reference count
  request(keys: string | string[]): DisposableLike {
    if (!Array.isArray(keys)) {
      keys = [keys];
    }
    for (let key of keys) {
      this.requestStore(key);
    }
    let disposable = {
      dispose: () => {
        for (let key of keys) {
          this.releaseStore(key);
        }
      }
    };
    this.disposables.add(disposable);
    return disposable;
  }

  _addOne(key: string) {
    if (this.storeMap.has(key)) return;
    let newStore = new this._StoreBuilder!();
    newStore.mapKey = key;

    let initState = this.__initStates__ ? this.__initStates__[key] : undefined;
    newStore._inject(this, this._StoreBuilder!, key, this._depStores, initState, {});
    this.storeMap.set(key, newStore);
    return newStore._init();
  }

  _deleteOne(key: string) {
    let store = this.storeMap.get(key);
    store && store.dispose();
    this.storeMap.delete(key);
  }

  add(key: string | string[]) {
    this.operateModeSwitch.enterDirectMode();

    if (Array.isArray(key)) {
      for (let k of key) {
        this._addOne(k);
      }
      return;
    }
    this._addOne(key);
  }

  delete(key: string | string[]) {
    if (Array.isArray(key)) {
      for (let k of key) {
        this._deleteOne(k);
      }
      return;
    }
    this._deleteOne(key);
  }

  clear() {
    let stores = this.storeMap.values();
    for (let store of stores) {
      store.dispose();
    }
    this.storeMap.clear();
  }

  setState(state: any) {
    this.state = { ...this.state, ...state };
    if (this._stateKey && this._appStore) {
      this._appStore.setState({ [this._stateKey]: this.state });
    }
  }

  dispose() {
    this.clear();
    this.disposables.dispose();
    this.state = {};
    this.emitter.dispose();
    if (this._stateKey && this._appStore) {
      this._appStore.setState({ [this._stateKey]: undefined });
    }
  }

  forEach(callback: (value: any, key: string, map: Map<string, any>) => void) {
    return this.storeMap.forEach(callback);
  }

  get(key: string) {
    return this.storeMap.get(key);
  }

  has(key: string) {
    return this.storeMap.has(key);
  }

  keys() {
    return this.storeMap.keys();
  }

  values() {
    return this.storeMap.values();
  }

  entries() {
    return this.storeMap.entries();
  }

  _addRef() {
    this._refCount += 1;
  }

  _decreaseRef() {
    this._refCount -= 1;
  }

  getRefCount() {
    return this._refCount;
  }
}
