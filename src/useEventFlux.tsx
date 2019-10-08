import { StoreDefineObj, StoreDefineItem, genStoreAndState } from "./withEventFlux";

export default function useEventFlux(props: any, ...args: StoreDefineObj[] | StoreDefineItem[]) {
  let [retStores, newState] = genStoreAndState(args, props);
  return { ...retStores, ...newState };
}