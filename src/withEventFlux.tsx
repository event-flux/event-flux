import * as React from 'react';
import Provider, { EventFluxContext } from './Provider';
import DispatchItem from './DispatchItem';
import * as memoizeOne from 'memoize-one';
import { StoreDeclarer, StoreListDeclarer, StoreMapDeclarer } from './StoreDeclarer';
import { StoreMap } from '.';
import AppStore from './AppStore';

const { useContext, useEffect, useMemo, useRef } = React;

export const FilterAll = (state: any) => state;

export type StateFilter = (state: any) => any;

export interface StoreObjValDef {
  filter: string[] | StateFilter,
  mapKey?: string;
  mapFilter?: StoreMapKeyFilter;
  as?: string;
}

export interface StoreDefineObj {
  [storeKey: string]: string[] | StateFilter | StoreObjValDef; 
}

export type StoreMapKeyFilter = (props: any) => string[];

export type StoreDefineItem = string | [string] | [string, string[] | StateFilter | StoreObjValDef];

type StoreType = "Item" | "List" | "Map";

// type StoreDefItemWithKey = [StoreKeyItem, string[] | StateFilter, string | null];
export interface StoreDefItemWithKey {
  storeKey: string;
  storeType?: StoreType;
  storeMapFilter?: StoreMapKeyFilter;
  storeMapKey?: string;
  stateFilter: string[] | StateFilter;
  stateKey?: string;
  as?: string;
}

function parseStoreValDef(storeKey: string, storeVal: string[] | StateFilter | StoreObjValDef): StoreDefItemWithKey {
  if (Array.isArray(storeVal) || typeof storeVal === "function") {
    return { 
      storeKey: storeKey, stateFilter: storeVal
    };
  } else {
    return {
      storeKey: storeKey, stateFilter: storeVal.filter, storeMapFilter: storeVal.mapFilter, as: storeVal.as, storeMapKey: storeVal.mapKey,
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

export function processState(state: any, handler: string[] | StateFilter) {
  if (Array.isArray(handler)) {
    let retState: any = {};
    for (let key of handler) {
      let keys: string[] = key.split(".");
      retState[keys[keys.length - 1]] = keys.reduce((obj: any, k) => (obj == null ? obj : obj[k]), state);
    }
    return retState;
  } else {
    return handler(state);
  }
}

export function createStateHandler(storeDef: StoreDefItemWithKey) {
  let curHandler;
  if (storeDef.storeType === "Item") {
    curHandler = (memoizeOne.default || memoizeOne)(
      (curState: any, stateFunc: string[] | StateFilter) => processState(curState, stateFunc)
    );
  } else if (storeDef.storeMapFilter) {
    curHandler = (memoizeOne.default || memoizeOne)(
      (curState: any, stateFunc: string[] | StateFilter, storeMapFilter: StoreMapKeyFilter, stateKey: string, props: any) => {
        let filterState: { [key: string]: any } = {};
        let keys = storeMapFilter(props);
        for (let key of keys) {
          filterState[key] = processState(curState[key], stateFunc); 
        }
        return { [stateKey]: filterState };
      }
    );
  } else {
    curHandler = (memoizeOne.default || memoizeOne)(
      (curState: any, stateFunc: string[] | StateFilter, stateKey: string) => {
        let filterState: { [key: string]: any } = {};
        for (let key in curState) {
          filterState[key] = processState(curState[key], stateFunc); 
        }
        return { [stateKey]: filterState };
      }
    );
  }
  return curHandler;
}

export function handleFilterState(state: any, stateKey: string, storeDef: StoreDefItemWithKey, filterHandler: any, props: any) {
  if (storeDef.storeType === "Item") {
    return filterHandler(state[stateKey], storeDef.stateFilter);
  } else if (storeDef.storeMapFilter) {
    return filterHandler(state[stateKey], storeDef.stateFilter, storeDef.storeMapFilter, storeDef.storeMapKey || storeDef.stateKey, props);
  } else {
    return filterHandler(state[stateKey], storeDef.stateFilter, storeDef.storeMapKey || storeDef.stateKey);
  }
}

type ReqStores = { [storeKey: string]: DispatchItem };
type ReqStoreMaps = { [storeKey: string]: { store: DispatchItem, storeMapFilter: StoreMapKeyFilter } };

function useReqForStore(defList: StoreDefItemWithKey[], _appStore: AppStore | undefined): [ReqStores, ReqStoreMaps] {
  let retStores = useMemo(() => {
    let reqStores: ReqStores = {};
    let reqStoreMaps: ReqStoreMaps = {};
    for (let storeDef of defList) {
      let storeKey = storeDef.storeKey;
      let store = reqStores[storeDef.as || storeKey] = _appStore!.requestStore(storeKey);
      let storeDeclarer = _appStore!._storeRegisterMap[storeKey];

      if (StoreDeclarer.isStore(storeDeclarer)) {
        storeDef.storeType = "Item";
      } else if (StoreListDeclarer.isStoreList(storeDeclarer)) {
        storeDef.storeType = "List";
      } else if (StoreMapDeclarer.isStoreMap(storeDeclarer)) {
        storeDef.storeType = "Map";
        if (storeDef.storeMapFilter) {
          reqStoreMaps[storeKey] = { store, storeMapFilter: storeDef.storeMapFilter };
        }
      }
      storeDef.stateKey = store._stateKey!;
    }
    return [reqStores, reqStoreMaps] as [ReqStores, ReqStoreMaps];
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

function useReqForStoreMap(reqStoreMaps: ReqStoreMaps, props: any) {
  const storeMapRef = useRef<any>({});
  for (let storeKey in reqStoreMaps) {
    let { store, storeMapFilter } = reqStoreMaps[storeKey];
    let filterKeys = storeMapFilter(props);
    if (filterKeys) {
      for (let key of filterKeys) {
        (store as StoreMap<any>).requestStore(key);
      }
    }
    
    useEffect(() => {
      storeMapRef.current[storeKey] = filterKeys;
    });

    let prevKeys = storeMapRef.current[storeKey];
    if (prevKeys) {
      for (let key of prevKeys) {
        (store as StoreMap<any>).releaseStore(key);
      }
    }
  }

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
} 

function useFilterState(defList: StoreDefItemWithKey[], _appStore: AppStore | undefined, state: any, props: any) {
  let stateRefs = useRef<any>([]);

  let newState;
  for (let storeDef of defList) {
    let stateKey: string = storeDef.stateKey!;
    let curHandler = stateRefs.current[stateKey];
    if (!curHandler) {
      stateRefs.current[stateKey] = curHandler = createStateHandler(storeDef);
      // When we first create the store, we get the state from the appStore
      // Object.assign(newState, curHandler(stateKey ? _appStore!.state[stateKey] : _appStore!.state, storeDef.stateFilter, storeDef));
      let thisState = handleFilterState(_appStore!.state, stateKey, storeDef, curHandler, props);
      newState = newState == null ? thisState : Object.assign(newState, thisState);
    } else {
      // Object.assign(newState, curHandler(stateKey ? state[stateKey] : state, storeDef.stateFilter, storeDef));
      let thisState = handleFilterState(state, stateKey, storeDef, curHandler, props);
      newState = newState == null ? thisState : Object.assign(newState, thisState);
    }
  }
  return newState;
}

export function genStoreAndState(args: StoreDefineObj[] | StoreDefineItem[], props: any) {
  let { _appStore, stores, state } = useContext(EventFluxContext);

  let defList: StoreDefItemWithKey[] = useMemo(() => transformDefArgs(args), []);

  let [retStores, reqStoreMaps] = useReqForStore(defList, _appStore);
  
  useReqForStoreMap(reqStoreMaps, props);

  let newState = useFilterState(defList, _appStore, state, props);

  return [retStores, newState];
}

export default function withEventFlux(...args: StoreDefineObj[] | StoreDefineItem[]) {
  
  return function(Component: React.ComponentType) {

    return function(props: any) {
      let [retStores, newState] = genStoreAndState(args, props);
      return (
        <Component {...props} {...retStores} {...newState}/>
      );
    }
  }
}