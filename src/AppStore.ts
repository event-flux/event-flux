import BatchUpdateHost from './BatchUpdateHost';
import { StoreBaseConstructor, AnyStoreDeclarer } from './StoreDeclarer';
import RecycleStrategy from "./RecycleStrategy";
import searchCycleCollection from "./searchCycleCollection";
import DispatchItem from './DispatchItem';
import DispatchParent from './DispatchParent';
const IS_APP_STORE = '@@__APP_STORE__@@';

export default class AppStore implements DispatchParent {
  _isInit = false;
  didChangeCallbacks: Function[] = [];

  batchUpdater: BatchUpdateHost;
  prevState: any = {};
  state: any = {};
  stores: { [storeKey: string]: DispatchItem } = {};

  _storeRegisterMap: { [storeName: string]: AnyStoreDeclarer } = {};
  // Save all of the circular dependency stores name.
  _cycleCollections: Set<string>[] | undefined;

  _recycleStrategy: RecycleStrategy = RecycleStrategy.Never;
  _depStoreList: { [storeName: string]: string[] } = {};

  __initStates__: any;

  // Check any object is AppStore object or not.
  static isAppStore: Function;
  
  constructor(storeDeclarers?: AnyStoreDeclarer[] | { [key: string]: any }, initStates?: any) {
    this.batchUpdater = new BatchUpdateHost(this);  
    if (Array.isArray(storeDeclarers)) {
      this.registerStore(...storeDeclarers);
    } else {
      initStates = storeDeclarers;
    }
    if (initStates) {
      this.__initStates__ = initStates;
      this.state = initStates;
    }
  }

  // buildStore(storeClass, args, options) {
  //   return buildStore(this, storeClass, args, options);
  // }

  setState(state: any) {
    if (!this._isInit) {  // 未初始化完成
      Object.assign(this.state, state);
    } else {
      this.state = Object.assign({}, this.state, state);
      this.batchUpdater.requestUpdate();
    }
  }

  _sendUpdate() {
    this.handleWillChange && this.handleWillChange(this.prevState, this.state);
    this.didChangeCallbacks.forEach(callback => callback(this.state));
    this.prevState = this.state;
  }

  forceUpdate() {
    this._sendUpdate();
  }

  handleWillChange(prevState: any, state: any) {
  }
  
  onDidChange(callback: Function) {
    this.didChangeCallbacks.push(callback);
    return { 
      dispose: () => {
        let index = this.didChangeCallbacks.indexOf(callback);
        if (index !== -1) {
          this.didChangeCallbacks.splice(index, 1);
        }
      }
    };
  }

  preloadStores(stores: string[], lifetime: "static" | "dynamic" = "dynamic") {
    let allDepList: string[] = [];
    for (let storeKey of stores) {
      let store = this.stores[this._getStoreKey(storeKey)];
      if (!store) {
        let depList = this._createStoreAndInject(storeKey);
        allDepList = allDepList.concat(depList);
        // For preload stores, it need not add reference count.
        if (lifetime === "dynamic") {
          this.stores[this._getStoreKey(storeKey)]._decreaseRef(); 
        }
      }
    }
    // Wait for all the stores and the dependencies init.
    let initPromises = [];
    for (let i = allDepList.length - 1; i >= 0; i -= 1) {
      let storeKey = allDepList[i];
      initPromises.push(this.stores[this._getStoreKey(storeKey)]._init());
    }
    return Promise.all(initPromises);
  }

  preloadStaticStores() {
    let registerMap = this._storeRegisterMap;
    let preloads: string[] = [];
    for (let storeKey in registerMap) {
      if (registerMap[storeKey].options!.lifetime === "static") {
        preloads.push(storeKey);
      }
    }
    return this.preloadStores(preloads, "static");
  }

  init() {
    this._isInit = true;
    this.prevState = this.state;

    this._cycleCollections = searchCycleCollection(this._storeRegisterMap);
    if (typeof window === "object") {
      this.preloadStaticStores();
    }
    return this;
  }

  dispose() {
    this.didChangeCallbacks = [];
    this.prevState = this.state = null;
    for (var key in this.stores) {
      let store = this.stores[key];
      store.dispose();
    }
    this.stores = {};
  }

  setRecycleStrategy(recycleStrategy: RecycleStrategy) {
    if (this._recycleStrategy !== recycleStrategy && recycleStrategy === RecycleStrategy.Urgent) {
      for (let finalStoreKey in this.stores) {
        let store = this.stores[finalStoreKey];
        if (store && store.getRefCount() === 0) {
          let [storeKey, opts] = this._parseStoreKey(finalStoreKey);
          this._disposeStoreAndDeps(storeKey, store, opts);
        }
      }
    }
    this._recycleStrategy = recycleStrategy;
  }

  /**
   * Register the store into the appStore with storeDeclarer
   * @param storeDeclarer: AnyStoreDeclater
   */
  registerStore(...storeDeclarers: AnyStoreDeclarer[]) {
    for (let storeDeclarer of storeDeclarers) {
      let storeKey = storeDeclarer.options!.storeKey!;
      if (this._storeRegisterMap[storeKey]) {
        console.error(`Many Stores named ${storeKey} will be registered, That is not allowed!`);
      }
      this._storeRegisterMap[storeKey] = storeDeclarer;
    }
  }

  /**
   * Request the appStore to create store by the storeKey if this store has exists and add reference to 1
   * Request the appStore to add reference count if this store has exists.
   * @param storeKey 
   */
  requestStore(storeKey: string, storeOpts?: any): DispatchItem {
    let finalStoreKey = this._getStoreKey(storeKey, storeOpts);

    let store = this.stores[finalStoreKey];
    if (!store) {
      
      let depList = this._createStoreAndInject(storeKey, storeOpts);
      // Invoke the depList's willInit, the dependency store's willInit will be invoked first
      // for (let i = depList.length - 1; i >= 0; i -= 1) {
      //   let storeKey = depList[i];
      //   this.stores[storeKey].willInit();
      // }

      // Invoke the depList's init, the dependency store's init will be invoked first
      for (let i = depList.length - 1; i >= 0; i -= 1) {
        let storeKey = depList[i];
        this.stores[this._getStoreKey(storeKey, storeOpts)]._init();
      }
      store = this.stores[finalStoreKey];
    } else {
      store._addRef();
    }
    return store;
  }

  /**
   * Release the store reference count with name of storeKey, if the reference count decrease to 0, then the store destroy.
   * @param storeKey 
   */
  releaseStore(storeKey: string, storeOpts?: any) {
    let finalStoreKey = this._getStoreKey(storeKey, storeOpts);

    let store = this.stores[finalStoreKey];
    if (!store) return;
    // store._decreaseRef();
    // If the store will be disposed, then we check if we can dispose or not
    if (store.getRefCount() === 1) {
      for (let cycleSet of this._cycleCollections!) {
        if (cycleSet.has(storeKey)) {
          for (let iKey of cycleSet) {
            iKey = this._getStoreKey(iKey, storeOpts);
            if (this.stores[iKey].getRefCount() > 1) {
              this.stores[iKey]._decreaseRef();
              return;
            }
          }
        }
      }

      // console.log("Not found circle dependency can decrease");
      store._decreaseRef();

      // If all of the cycle collections cannot find the ref count > 1, then we can dispose all of the dependency stores
      // breadth-first search all the dependency store and derease the reference count, If this store's count decrease to 0, dispose it.
      if (this._recycleStrategy === RecycleStrategy.Urgent) {
        this._disposeStoreAndDeps(storeKey, store, storeOpts);        
      }
    } else {
      store._decreaseRef();
    }
  }

  _createStoreAndInject(storeKey: string, storeOpts?: any) {
    // Search all of the dependency stores for this `storeKey` with Breadth first search
    let depList = [storeKey];
    for (let i = 0; i < depList.length; i += 1) {
      let curStoreKey = depList[i];

      let storeInfo = this._storeRegisterMap[curStoreKey];
      if (!storeInfo) {
        console.error(`The request store ${curStoreKey} is not registered!`);
        continue;
      }
      let depNames = storeInfo.depStoreNames || [];

      let filterDepNames = [];
      for (let depName of depNames) {
        // The depName is not registered

        if (!this._storeRegisterMap[depName]) {
          console.error(`The dependency store ${depName} is not registered!`);
          continue;
        }
        let depStore = this.stores[this._getStoreKey(depName, storeOpts)];

        // If the dependency store has exists, then this store don't need to appear in the depList
        // And if this dependency is the recursive dependency, then we need to remove it from the depList
        if (depStore) {
          // This dependency store is exists, then we need add the reference count.
          depStore._addRef();
        } else if (depList.indexOf(depName) === -1) {
          filterDepNames.push(depName);
        }
      }
  
      depList.splice(depList.length, 0, ...filterDepNames);
    }
    
    // Create all the dependency stores and add the reference count
    for (let i = depList.length - 1; i >= 0; i -= 1) {
      let storeKey = depList[i];
      // let storeInfo = this._storeRegisterMap[storeKey];
      let curStore = this._storeRegisterMap[storeKey].create(this);
      curStore._addRef();
      // this.stores[this._getStoreKey(storeKey, storeOpts)] = curStore;
      this._createStore(storeKey, curStore, storeOpts);
    }

    // Inject all of the dependency stores for depList
    for (let i = depList.length - 1; i >= 0; i -= 1) {
      let storeKey = depList[i];
      let storeInfo = this._storeRegisterMap[storeKey];
      let depNames = storeInfo.depStoreNames || [];
      let depStores: { [storeKey: string]: DispatchItem } = {};
      for (let depName of depNames) {
        depStores[depName] = this.stores[this._getStoreKey(depName, storeOpts)];
      }
      let { stateKey } = storeInfo.options!;
      let initState = this.__initStates__ ? stateKey ? this.__initStates__[stateKey] : this.__initStates__ : undefined;
      this.stores[this._getStoreKey(storeKey, storeOpts)]._inject(
        storeInfo.Store, this._getStateKey(storeKey, stateKey!, storeOpts), depStores, initState, storeInfo.options
      );
    }
    return depList;
  }
 
  _disposeStoreAndDeps(storeKey: string, store: DispatchItem, storeOpts?: any) {
    if (store.getRefCount() > 0) return;
    store.dispose();
    // delete this.stores[this._getStoreKey(storeKey, storeOpts)];
    this._deleteStore(storeKey, storeOpts);

    let depList = [storeKey];
    for (let i = 0; i < depList.length; i += 1) {
      let curStoreKey = depList[i];

      let storeInfo = this._storeRegisterMap[curStoreKey];
      
      let depNames = storeInfo.depStoreNames || [];

      let filterDepNames = [];
      for (let depName of depNames) {
        let depStore = this.stores[this._getStoreKey(depName, storeOpts)];

        if (!depStore) continue;

        depStore._decreaseRef();

        if (depStore.getRefCount() === 0) {
          depStore.dispose();
          // delete this.stores[this._getStoreKey(depName, storeOpts)];
          this._deleteStore(depName, storeOpts);

          if (depList.indexOf(depName) === -1) {
            filterDepNames.push(depName);
          }
        }
      }
  
      depList.splice(depList.length, 0, ...filterDepNames);
    }
  }
 
  // calculate the storeKey by the origin storeKey and storeOpts
  _getStoreKey(storeKey: string, storeOpts?: any) {
    return storeKey;
  }

  // Extract the origin storeKey and storeOpts from the final store key.
  _parseStoreKey(finalStoreKey: string): [string, any] {
    return [finalStoreKey, undefined];
  }

  // calculate the stateKey by the origin stateKey and storeOpts
  _getStateKey(storeKey: string, stateKey: string, storeOpts?: any) {
    return stateKey;
  }

  _createStore(storeKey: string, store: DispatchItem, storeOpts?: any) {
    this.stores[this._getStoreKey(storeKey, storeOpts)] = store;
  }

  _deleteStore(storeKey: string, storeOpts?: any) {
    delete this.stores[this._getStoreKey(storeKey, storeOpts)];
  }
}

(AppStore.prototype as any)[IS_APP_STORE] = true;
AppStore.isAppStore = function(maybeAppStore: any) {
  return !!(maybeAppStore && maybeAppStore[IS_APP_STORE]);
}