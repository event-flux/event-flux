import { StoreMapDeclarerOptions, StoreBaseConstructor, StoreMapDeclarer } from './StoreDeclarer';
import DispatchItem from './DispatchItem';
import DispatchParent from './DispatchParent';
import { DisposableLike, CompositeDisposable } from 'event-kit';

export enum OperateMode {
  None,
  Direct,
  RefCount,
}

export class OperateModeSwitch {
  operateMode: OperateMode = OperateMode.None;

  enterRefCountMode() {
    if (this.operateMode === OperateMode.Direct) {
      throw new Error(`
        You request store that use direct mode, so requesting store by "request" method is not allowed. 
        Try to remove all the "add" invocation and "keys" declarer options.
      `)
    }
    this.operateMode = OperateMode.RefCount;
  }

  enterDirectMode() {
    if (this.operateMode === OperateMode.RefCount) {
      throw new Error(`You request store that use reference count, so requesting store by "add" and "delete" is not allowed.`)
    }
    this.operateMode = OperateMode.Direct;
  }
}

export default class StoreMap<T> {
  storeMap: Map<string, any> = new Map();

  _options: StoreMapDeclarerOptions | undefined;
  _StoreBuilder: StoreBaseConstructor<T> | undefined;
  _depStores: { [storeKey: string]: DispatchItem } = {};
  _stateKey: string | undefined;

  _appStore: DispatchParent;
  _refCount = 0;

  __initStates__: any;
  state: any = {};

  _keyRefs: { [key: string]: number } = {};
  _disposables = new CompositeDisposable();
  operateModeSwitch = new OperateModeSwitch();

  constructor(appStore: DispatchParent) {
    this._appStore = appStore;
  }

  _init() {
    let keys = this._options!.keys;
    if (keys && Array.isArray(keys)) {
      return Promise.all([...keys.map(key => this.add(key)), this.init()]);
    }
    return this.init();
  }

  init() {}
  
  _inject(StoreBuilder: StoreBaseConstructor<T>, stateKey?: string, depStores?: { [storeKey: string]: DispatchItem }, initState?: any, options?: StoreMapDeclarerOptions) {
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
      this._addOne(storeKey);
    }
  }

  releaseStore(storeKey: string) {
    this._keyRefs[storeKey] -= 1;
    if (this._keyRefs[storeKey] === 0) {
      this._deleteOne(storeKey);
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
    this._disposables.add(disposable);
    return disposable;
  }

  _addOne(key: string) {
    if (this.storeMap.has(key)) return;
    let newStore = new this._StoreBuilder!(this);
    newStore.mapKey = key;

    let initState = this.__initStates__ ? this.__initStates__[key] : undefined;
    newStore._inject(this._StoreBuilder!, key, this._depStores, initState, {});
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
    if (this._stateKey) {
      this._appStore.setState({ [this._stateKey]: this.state });
    }
  }

  dispose() {
    this.clear();
    this._disposables.dispose();
    this.state = {};
    if (this._stateKey) {
      this._appStore.setState({ [this._stateKey]: undefined });
    }
  }

  forEach(callback: (value: any, key: string, map: Map<string, any>) => void) { 
    return this.storeMap.forEach(callback); 
  }

  get(key: string) { return this.storeMap.get(key); }

  has(key: string) { return this.storeMap.has(key); }

  keys() { return this.storeMap.keys(); }

  values() { return this.storeMap.values(); }

  entries() { return this.storeMap.entries(); }

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
