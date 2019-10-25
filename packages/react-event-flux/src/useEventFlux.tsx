import { StoreDefineObj, StoreDefineItem, genStoreAndState } from "./withEventFlux";

export default function useEventFlux(...args: StoreDefineObj[] | StoreDefineItem[] | any[]) {
  let storeArgs: StoreDefineObj[] | StoreDefineItem[];
  let props: any;
  if (args.length <= 0) {
    throw new Error("The parameters cannot be empty");
  }
  if (Array.isArray(args[0]) || typeof args[0] === "string") {
    let lastArg = args[args.length - 1];
    if (args.length > 1 && !Array.isArray(lastArg) && typeof lastArg === "object") {
      props = lastArg;
      storeArgs = args.slice(0, args.length - 1);
    } else {
      storeArgs = args;
    }
  } else {
    if (args.length === 1) {
      storeArgs = args;
    } else {
      storeArgs = args.slice(0, 1);
      props = args[args.length - 1];
    }
  }
  let [retStores, newState] = genStoreAndState(storeArgs, props);
  return { ...retStores, ...newState };
}
