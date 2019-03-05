const isEmpty = require('lodash/isEmpty');

interface ListStorePathUnit {
  index: string;
  name: string;
  type: 'Map' | 'List';
};

type StorePathUnit = ListStorePathUnit | string;

type StoreType = 'Store' | 'StoreList' | 'StoreMap';
interface StoreShape {
  type: StoreType;    // The type of store
  filters: {          // Store's children store
    [key: string]: StoreShape;
  } | null;
  path?: StorePathUnit[];  // The path of store in the store tree
};

type StoreFilters = {
  [name: string]: StoreShape;
}

const ListenForwardKeys = [
  'listen', 'unlisten'
];

const IndexForwardKeys = [
  'listen', 'unlisten', 'listenForKeys', 'unlistenForKeys'
];

export default class StoreProxyHandler {
  storeProxyCache = new Map();

  /* Gen proxy for the storePath such as [todoMapStore, todoStore] 
    forwardStore standard for the forward path
  */
  genProxy(storePath, forwardStore, forwarder) {
    return new Proxy(forwarder, {
      get: function(target, propName) {
        if (!propName) return;
        if (forwardStore && forwardStore[propName]) return forwardStore[propName];
        if (ListenForwardKeys.indexOf(propName as string) !== -1) {
          return function(...args) {
            args.unshift(window['clientId']);
            return forwarder({ store: storePath, method: propName, args });
          };
        }
        return function(...args) {
          return forwarder({ store: storePath, method: propName, args });
        };
      }
    })
  }

  genIndexProxy(storePath, childFilters, forwarder) {
    let storePathKey = storePath.slice(0, storePath.length - 1).toString();
    let newProxy = new Proxy(forwarder, {
      get: (target, propName) => {
        if (!propName) return;
        const retIndexFunc = (index) => {
          let cacheStore = this.storeProxyCache.get(storePathKey + index);
          if (cacheStore) return cacheStore;

          let mapStorepath = [
            ...storePath.slice(0, -1), 
            { ...storePath[storePath.length - 1], index }
          ];
          let childStores = this.proxyStore(mapStorepath, childFilters, forwarder);
          let newStore = this.genProxy(mapStorepath, childStores, forwarder);
          this.storeProxyCache.set(storePathKey + index, newStore);
          return newStore;
        }
        if (IndexForwardKeys.indexOf(propName as string) !== -1) {
          let oneStorePath = [
            ...storePath.slice(0, -1), storePath[storePath.length - 1].name
          ];
          return function(...args) {
            args.unshift(window['clientId']);
            return forwarder({ store: oneStorePath, method: propName, args });
          };
        }
        if (propName === 'get') {
          return retIndexFunc;
        }
        return retIndexFunc(propName);
      }
    });
    return newProxy;
  }

  proxyStore(parentStore: StorePathUnit[], storeFilters: StoreFilters, forwarder: Function) {
    if (isEmpty(storeFilters)) return null;
    let stores = {};
    for (let name in storeFilters) {
      let storeInfo = storeFilters[name];
      if (storeInfo) {
        let { type, filters, path = parentStore } = storeInfo;
        let names;
        if (type === 'Store') {
          names = [...path, name];
        } else if (type === 'StoreList') {
          names = [...path, { name, type: 'List' }];
        } else if (type === 'StoreMap') {
          names = [...path, { name, type: 'Map' }];
        }
        if (type === 'Store') {
          let childStores = this.proxyStore(names, filters, forwarder);
          stores[name] = this.genProxy(names, childStores, forwarder);
        } else {
          stores[name] = this.genIndexProxy(names, filters, forwarder);
        }
      }
    }
    return stores;
  }

  proxyStores(storeFilters: StoreFilters, forwarder: Function): any {
    return this.proxyStore([], storeFilters, forwarder);
  }
}