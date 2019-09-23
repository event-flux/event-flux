import * as React from 'react';
import Provider, { StoreContext } from './Provider';
import DispatchItem from './DispatchItem';
import * as memoizeOne from 'memoize-one';

const { useContext, useEffect, useMemo, useRef } = React;

export const FilterAll = (state: any) => state;

type StateFilter = (state: any) => any;

export interface StoreDefineObj {
  [storeKey: string]: string[] | StateFilter; 
}

export type StoreDefineItem = string | [string, string[] | StateFilter];

type StoreDefItemWithKey = [string, string[] | StateFilter, string | null];

export function transformDefArgs(args: StoreDefineObj[] | StoreDefineItem[]): StoreDefItemWithKey[] {
  let defList: StoreDefItemWithKey[] = [];
  if (args.length === 1 && typeof args[0] === "object" && !Array.isArray(args[0])) {
    let defObj = args[0] as StoreDefineObj;
    for (let storeKey in defObj) {
      defList.push([storeKey, defObj[storeKey], null]); 
    }
  } else {
    defList = (args as StoreDefineItem[]).map(defItem => {
      if (typeof defItem === "string") {
        return [defItem, [], null] as StoreDefItemWithKey;
      }
      return [...defItem, null] as StoreDefItemWithKey;
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
 
export function genStoreAndState(args: StoreDefineObj[] | StoreDefineItem[]) {
  let { _appStore, stores, state } = useContext(StoreContext);

  let defList: StoreDefItemWithKey[] = useMemo(() => transformDefArgs(args), []);

  let retStores = useMemo(() => {
    let reqStores: { [storeKey: string]: DispatchItem } = {};
    for (let storeDef of defList) {
      let storeKey = storeDef[0];
      reqStores[storeKey] = _appStore!.requestStore(storeKey);
      storeDef[2] = reqStores[storeKey]._stateKey!;
    }
    return reqStores;
  }, []);

  useEffect(() =>  {
    return () => {
      for (let storeDef of defList) {
        let storeKey = storeDef[0];
        _appStore!.releaseStore(storeKey);
      }
    }
  }, []);
  
  let stateRefs = useRef<any>({});

  let newState = {};
  for (let storeDef of defList) {
    let stateKey: string = storeDef[2]!;
    let curHandler = stateRefs.current[stateKey];
    if (!curHandler) {
      curHandler = stateRefs.current[stateKey] = (memoizeOne.default || memoizeOne)(
        (curState: any, stateFunc: string[] | StateFilter) => processState(curState, stateFunc),
      );
      // When we first create the store, we get the state from the appStore
      Object.assign(newState, curHandler(stateKey ? _appStore!.state[stateKey] : _appStore!.state, storeDef[1]));
    } else {
      Object.assign(newState, curHandler(stateKey ? state[stateKey] : state, storeDef[1]));
    }
  }
  return [retStores, newState];
}

export default function withEventFlux(...args: StoreDefineObj[] | StoreDefineItem[]) {
  
  return function(Component: React.ComponentType) {

    return function(props: any) {
      let [retStores, newState] = genStoreAndState(args);
      return (
        <Component {...props} {...retStores} {...newState}/>
      );
    }
  }
}