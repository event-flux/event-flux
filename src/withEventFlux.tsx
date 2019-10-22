import * as React from 'react';
import Provider, { EventFluxContext } from './Provider';
import DispatchItem from './DispatchItem';
import * as memoizeOne from 'memoize-one';
import { StoreDeclarer, StoreListDeclarer, StoreMapDeclarer } from './StoreDeclarer';
import { StoreMap } from '.';
import AppStore from './AppStore';
import { arraysEqual } from './arrayUtils';

const { useContext, useEffect, useMemo, useRef } = React;

export enum Filter {
  FA = "FA",
  EA = "EA",
}

export type StateFilter = (state: any) => any;

export interface StoreObjValDef {
  filter: string[] | StateFilter | Filter;
  mapKey?: string;
  mapFilter?: StoreMapKeyFilter;
  mapSpread?: StoreMapKeySpread;
  as?: string;
}

export interface StoreDefineObj {
  [storeKey: string]: string[] | StateFilter | StoreObjValDef | Filter; 
}

export type StoreMapKeyFilter = (props: any) => string[];
export type StoreMapKeySpread = (props: any) => string;

export type StoreDefineItem = string | [string] | [string, string[] | StateFilter | StoreObjValDef | Filter];

type StoreType = "Item" | "List" | "Map";

// type StoreDefItemWithKey = [StoreKeyItem, string[] | StateFilter, string | null];
export interface StoreDefItemWithKey {
  storeKey: string;
  storeType?: StoreType;
  storeMapFilter?: StoreMapKeyFilter;
  storeMapSpread?: StoreMapKeySpread;
  storeMapKey?: string;
  stateFilter: string[] | StateFilter | Filter;
  stateKey?: string;
  as?: string;
}

function parseStoreValDef(storeKey: string, storeVal: string[] | StateFilter | StoreObjValDef | Filter): StoreDefItemWithKey {
  if (Array.isArray(storeVal) || typeof storeVal === "function" || typeof storeVal === "string") {
    return { 
      storeKey: storeKey, stateFilter: storeVal
    };
  } else {
    return {
      storeKey: storeKey, stateFilter: storeVal.filter, 
      storeMapFilter: storeVal.mapFilter, storeMapSpread: storeVal.mapSpread, 
      as: storeVal.as, storeMapKey: storeVal.mapKey,
    };
  }
}
export function transformDefArgs(args: StoreDefineObj[] | StoreDefineItem[]): StoreDefItemWithKey[] {
  let defList: StoreDefItemWithKey[] = [];
  if (args.length >= 1 && typeof args[0] === "object" && !Array.isArray(args[0])) {
    let defObj = args[0] as StoreDefineObj;
    for (let storeKey in defObj) {
      defList.push(parseStoreValDef(storeKey, defObj[storeKey])); 
    }
  } else {
    defList = (args as StoreDefineItem[]).map((defItem: StoreDefineItem) => {
      if (!Array.isArray(defItem)) {
        return { storeKey: defItem, stateFilter: [] };
      } else {
        if (defItem.length === 1) {
          return { storeKey: defItem[0], stateFilter: [] };
        } else {
          return parseStoreValDef(defItem[0], defItem[1]!);
        }
      }
    });
  }
  return defList;
}

export function processState(state: any = {}, handler: string[] | StateFilter | Filter, stateKey: string) {
  if (Array.isArray(handler)) {
    let retState: any = {};
    for (let key of handler) {
      let keys: string[] = key.split(".");
      retState[keys[keys.length - 1]] = keys.reduce((obj: any, k) => (obj == null ? obj : obj[k]), state);
    }
    return retState;
  } else if (typeof handler === "function") {
    return handler(state);
  } else {
    switch (handler) {
      case Filter.FA: return { [stateKey]: state };
      case Filter.EA: return state;
    }
  }
}

export function createStateHandler(storeDef: StoreDefItemWithKey) {
  let curHandler;
  if (storeDef.storeType === "Item") {
    curHandler = (memoizeOne.default || memoizeOne)(
      (curState: any = {}, stateFunc: string[] | StateFilter | Filter, stateKey: string) => processState(curState, stateFunc, stateKey)
    );
  } else if (storeDef.storeMapFilter) {
    curHandler = (memoizeOne.default || memoizeOne)(
      (curState: any = {}, stateFunc: string[] | StateFilter, storeMapFilter: StoreMapKeyFilter, stateKey: string, props: any) => {
        let filterState: { [key: string]: any } = {};
        let keys = storeMapFilter(props);
        for (let key of keys) {
          filterState[key] = processState(curState[key], stateFunc, stateKey); 
        }
        return { [stateKey]: filterState };
      }
    );
  } else if (storeDef.storeMapSpread) {
    curHandler = (memoizeOne.default || memoizeOne)(
      (curState: any = {}, stateFunc: string[] | StateFilter, storeMapSpread: StoreMapKeySpread, stateKey: string, props: any) => {
        let key = storeMapSpread(props);
        return processState(curState[key], stateFunc, stateKey); 
      }
    );
  } else {
    curHandler = (memoizeOne.default || memoizeOne)(
      (curState: any = {}, stateFunc: string[] | StateFilter, stateKey: string) => {
        let filterState: { [key: string]: any } = {};
        for (let key in curState) {
          filterState[key] = processState(curState[key], stateFunc, stateKey); 
        }
        return { [stateKey]: filterState };
      }
    );
  }
  return curHandler;
}

export function handleFilterState(state: any, stateKey: string, storeDef: StoreDefItemWithKey, filterHandler: any, props: any) {
  if (storeDef.storeType === "Item") {
    return filterHandler(state[stateKey], storeDef.stateFilter, storeDef.stateKey);
  } else if (storeDef.storeMapFilter) {
    return filterHandler(state[stateKey], storeDef.stateFilter, storeDef.storeMapFilter, storeDef.storeMapKey || storeDef.stateKey, props);
  } else if (storeDef.storeMapSpread) {
    return filterHandler(state[stateKey], storeDef.stateFilter, storeDef.storeMapSpread, storeDef.storeMapKey || storeDef.stateKey, props);
  } else {
    return filterHandler(state[stateKey], storeDef.stateFilter, storeDef.storeMapKey || storeDef.stateKey);
  }
}

type ReqStores = { [storeKey: string]: DispatchItem };
type ReqStoreMaps = { [storeKey: string]: { store: DispatchItem, storeMapFilter: StoreMapKeyFilter } };
type ReqStoreMapSpreads = { [storeKey: string]: { store: DispatchItem, storeMapSpread: StoreMapKeySpread } };

function getStoreKey(storeDef: StoreDefItemWithKey, storeKey: string) {
  storeKey = storeDef.as || storeKey;
  return storeDef.storeMapSpread ? "_" + storeKey : storeKey;
}

export function useReqForStore(defList: StoreDefItemWithKey[], _appStore: AppStore | undefined): [ReqStores, ReqStoreMaps, ReqStoreMapSpreads] {
  let retStores = useMemo(() => {
    let reqStores: ReqStores = {};
    let reqStoreMaps: ReqStoreMaps = {};
    let reqStoreMapSpreads: ReqStoreMapSpreads = {};

    for (let storeDef of defList) {
      let storeKey = storeDef.storeKey;
      let store = reqStores[getStoreKey(storeDef, storeKey)] = _appStore!.requestStore(storeKey);
      let storeDeclarer = _appStore!._storeRegisterMap[storeKey];

      if (StoreDeclarer.isStore(storeDeclarer)) {
        storeDef.storeType = "Item";
      } else if (StoreListDeclarer.isStoreList(storeDeclarer)) {
        storeDef.storeType = "List";
      } else if (StoreMapDeclarer.isStoreMap(storeDeclarer)) {
        storeDef.storeType = "Map";
        if (storeDef.storeMapFilter) {
          reqStoreMaps[storeKey] = { store, storeMapFilter: storeDef.storeMapFilter };
        } else if (storeDef.storeMapSpread) {
          reqStoreMapSpreads[storeDef.as || storeDef.storeKey] = { store, storeMapSpread: storeDef.storeMapSpread };
        }
      }
      storeDef.stateKey = store._stateKey!;
    }
    return [reqStores, reqStoreMaps, reqStoreMapSpreads] as [ReqStores, ReqStoreMaps, ReqStoreMapSpreads];
  }, []);

  useEffect(() =>  {
    return () => {
      for (let storeDef of defList) {
        let storeKey = storeDef.storeKey;
        _appStore!.releaseStore(storeKey);
      }
    }
  }, []);
  return retStores;
}

export function useReqForStoreMap(reqStoreMaps: ReqStoreMaps, props: any) {
  const storeMapRef = useRef<any>({});
  let isStoreChanged = false;

  let filterKeyRef: { [key: string]: string[] } = {};
  for (let storeKey in reqStoreMaps) {
    let { store, storeMapFilter } = reqStoreMaps[storeKey];

    let filterKeys = storeMapFilter(props);
    let prevKeys = storeMapRef.current[storeKey];

    if (!arraysEqual(filterKeys, prevKeys)) {
      if (filterKeys) {
        for (let key of filterKeys) {
          isStoreChanged = true;
          (store as StoreMap<any>).requestStore(key);
        }
      }
      if (prevKeys) {
        for (let key of prevKeys) {
          (store as StoreMap<any>).releaseStore(key);
        }
      }
    }

    filterKeyRef[storeKey] = filterKeys;
  }
  
  useEffect(() => {
    storeMapRef.current = filterKeyRef;
  }, [filterKeyRef]);

  useEffect(() => {
    return () => {
      for (let storeKey in reqStoreMaps) {
        let { store } = reqStoreMaps[storeKey];
        let prevKeys = storeMapRef.current[storeKey];
        if (prevKeys) {
          for (let key of prevKeys) {
            (store as StoreMap<any>).releaseStore(key);
          }
        }
      }
    }
  }, []);
  return isStoreChanged;
}

export function useReqForStoreMapSpread(reqStoreMaps: ReqStoreMapSpreads, props: any, reqStores: ReqStores) {
  const storeMapRef = useRef<any>({});
  let isStoreChanged = false;

  let filterKeyRef: { [key: string]: string } = {};

  for (let storeKey in reqStoreMaps) {
    let { store, storeMapSpread } = reqStoreMaps[storeKey];
    let filterKey = storeMapSpread(props);
    let prevKey = storeMapRef.current[storeKey];

    if (filterKey !== prevKey) {
      if (filterKey) {
        isStoreChanged = true;
        (store as StoreMap<any>).requestStore(filterKey);
        reqStores[storeKey] = store.get(filterKey);
      }
      if (prevKey) {
        (store as StoreMap<any>).releaseStore(prevKey);
      }
    }
    
    filterKeyRef[storeKey] = filterKey;
  }

  useEffect(() => {
    storeMapRef.current = filterKeyRef;
  }, [filterKeyRef]);

  useEffect(() => {
    return () => {
      for (let storeKey in reqStoreMaps) {
        let { store } = reqStoreMaps[storeKey];
        let prevKey = storeMapRef.current[storeKey];
        if (prevKey) {
          (store as StoreMap<any>).releaseStore(prevKey);
        }
      }
    }
  }, []);
  return isStoreChanged;
}

export function useFilterState(defList: StoreDefItemWithKey[], _appStore: AppStore | undefined, state: any, props: any, isStoreChange: boolean) {
  let stateRefs = useRef<any>([]);

  let newState;
  for (let storeDef of defList) {
    let stateKey: string = storeDef.stateKey!;
    let curHandler = stateRefs.current[stateKey];
    let isFirstReq = false;
    if (!curHandler) {
      stateRefs.current[stateKey] = curHandler = createStateHandler(storeDef);
      isFirstReq = true;
      let thisState = handleFilterState(_appStore!.state, stateKey, storeDef, curHandler, props);
      newState = newState == null ? thisState : Object.assign(newState, thisState);
    }  
    // When we first create the store or the store has changed, we get the state from the appStore
    let thisState = handleFilterState(isFirstReq || isStoreChange ? _appStore!.state : state, stateKey, storeDef, curHandler, props);
    newState = newState == null ? thisState : Object.assign(newState, thisState);
  }
  return newState;
}

export function genStoreAndState(args: StoreDefineObj[] | StoreDefineItem[], props: any) {
  let { _appStore, stores, state } = useContext(EventFluxContext);

  let defList: StoreDefItemWithKey[] = useMemo(() => transformDefArgs(args), []);

  let [retStores, reqStoreMaps, reqStoreMapSpreads] = useReqForStore(defList, _appStore);
  
  let isStoreChange = useReqForStoreMap(reqStoreMaps, props);
  let isSpreadChange = useReqForStoreMapSpread(reqStoreMapSpreads, props, retStores);

  let newState = useFilterState(defList, _appStore, state, props, isStoreChange || isSpreadChange);

  return [retStores, newState];
}

export default function withEventFlux(...args: StoreDefineObj[] | StoreDefineItem[]) {
  
  return function(Component: React.ComponentType) {

    return React.memo(React.forwardRef(function(props: any, ref) {
      let [retStores, newState] = genStoreAndState(args, props);
      return (
        <Component {...props} {...retStores} {...newState} ref={ref}/>
      );
    }));
  }
}