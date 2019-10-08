import * as React from 'react';
import Provider, { EventFluxContext } from './Provider';
import DispatchItem from './DispatchItem';
import * as memoizeOne from 'memoize-one';
import { StoreBase, StoreMap } from '.';
import { StoreDeclarer, StoreListDeclarer, StoreMapDeclarer } from './StoreDeclarer';

const { useContext, useEffect, useMemo, useRef } = React;

export const FilterAll = (state: any) => state;

type StateFilter = (state: any) => any;

export interface StoreDefineObj {
  [storeKey: string]: string[] | StateFilter; 
}

export type StoreMapKeyFilter = (props: any) => string[];

export type StoreDefineItem = string | [string] | [string, string[] | StateFilter] | [string, StoreMapKeyFilter, string[] | StateFilter];

type StoreType = "Item" | "List" | "Map";

// type StoreDefItemWithKey = [StoreKeyItem, string[] | StateFilter, string | null];
interface StoreDefItemWithKey {
  storeKey: string;
  storeType?: StoreType;
  storeMapFilter?: StoreMapKeyFilter;
  stateFilter: string[] | StateFilter;
  stateKey?: string;
}

export function transformDefArgs(args: StoreDefineObj[] | StoreDefineItem[]): StoreDefItemWithKey[] {
  let defList: StoreDefItemWithKey[] = [];
  if (args.length >= 1 && typeof args[0] === "object" && !Array.isArray(args[0])) {
    let defObj = args[0] as StoreDefineObj;
    for (let storeKey in defObj) {
      defList.push({ 
        storeKey: storeKey, stateFilter: defObj[storeKey]
      }); 
    }
  } else {
    defList = (args as StoreDefineItem[]).map((defItem: StoreDefineItem) => {
      if (!Array.isArray(defItem)) {
        return { storeKey: defItem, stateFilter: [] };
      } else {
        if (defItem.length === 1) {
          return { storeKey: defItem[0], stateFilter: [] };
        } else if (defItem.length === 2) {
          return { storeKey: defItem[0], stateFilter: defItem[1] } as StoreDefItemWithKey;
        } else {
          return { storeKey: defItem[0], stateFilter: defItem[2], storeMapFilter: defItem[1] } as StoreDefItemWithKey;  
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

function createStateHandler(storeDef: StoreDefItemWithKey) {
  let curHandler;
  if (storeDef.storeType === "Item") {
    curHandler = (memoizeOne.default || memoizeOne)(
      (curState: any, stateFunc: string[] | StateFilter) => processState(curState, stateFunc)
    );
  } else if (storeDef.storeMapFilter) {
    curHandler = (memoizeOne.default || memoizeOne)(
      (curState: any, stateFunc: string[] | StateFilter, storeMapFilter: StoreMapKeyFilter, props: any) => {
        let filterState: { [key: string]: any } = {};
        let keys = storeMapFilter(props);
        for (let key of keys) {
          filterState[key] = processState(curState[key], stateFunc); 
        }
        return filterState;
      }
    );
  } else {
    curHandler = (memoizeOne.default || memoizeOne)(
      (curState: any, stateFunc: string[] | StateFilter) => {
        let filterState: { [key: string]: any } = {};
        for (let key in curState) {
          filterState[key] = processState(curState[key], stateFunc); 
        }
        return filterState;
      }
    );
  }
  return curHandler;
}

function handleFilterState(state: any, stateKey: string, storeDef: StoreDefItemWithKey, filterHandler: any, props: any) {
  if (storeDef.storeType === "Item") {
    return filterHandler(state[stateKey], storeDef.stateFilter);
  } else if (storeDef.storeMapFilter) {
    return filterHandler(state[stateKey], storeDef.stateFilter, storeDef.storeMapFilter, props);
  } else {
    return filterHandler(state[stateKey], storeDef.stateFilter);
  }
}
 
export function genStoreAndState(args: StoreDefineObj[] | StoreDefineItem[], props: any) {
  let { _appStore, stores, state } = useContext(EventFluxContext);

  let defList: StoreDefItemWithKey[] = useMemo(() => transformDefArgs(args), []);

  let retStores = useMemo(() => {
    let reqStores: { [storeKey: string]: DispatchItem } = {};
    for (let storeDef of defList) {
      let storeKey = storeDef.storeKey;
      let store = reqStores[storeKey] = _appStore!.requestStore(storeKey);
      let storeDeclarer = _appStore!._storeRegisterMap[storeKey];

      if (StoreDeclarer.isStore(storeDeclarer)) {
        storeDef.storeType = "Item";
      } else if (StoreListDeclarer.isStoreList(storeDeclarer)) {
        storeDef.storeType = "List";
      } else if (StoreMapDeclarer.isStoreMap(storeDeclarer)) {
        storeDef.storeType = "Map";
      }
      storeDef.stateKey = store._stateKey!;
    }
    return reqStores;
  }, []);

  useEffect(() =>  {
    return () => {
      for (let storeDef of defList) {
        let storeKey = storeDef.storeKey;
        _appStore!.releaseStore(storeKey);
      }
    }
  }, []);
  
  let stateRefs = useRef<any>({});

  let newState = {};
  for (let storeDef of defList) {
    let stateKey: string = storeDef.stateKey!;
    let curHandler = stateRefs.current[stateKey];
    if (!curHandler) {
      stateRefs.current[stateKey] = curHandler = createStateHandler(storeDef);
      // When we first create the store, we get the state from the appStore
      // Object.assign(newState, curHandler(stateKey ? _appStore!.state[stateKey] : _appStore!.state, storeDef.stateFilter, storeDef));
      Object.assign(newState, handleFilterState(_appStore!.state, stateKey, storeDef, curHandler, props));
    } else {
      // Object.assign(newState, curHandler(stateKey ? state[stateKey] : state, storeDef.stateFilter, storeDef));
      Object.assign(newState, handleFilterState(state, stateKey, storeDef, curHandler, props));
    }
  }
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