import { StoreBaseConstructor } from "./StoreDeclarer";
import DispatchParent from "./DispatchParent";

export default interface DispatchItem {
  // Init this dispatch item
  _init(): any | Promise<any>;

  // AppStore will inject some state into this dispatch item
  _inject(
    appStore: DispatchParent | undefined,
    StoreBuilder: StoreBaseConstructor<any>,
    stateKey?: string,
    depStores?: { [storeKey: string]: DispatchItem },
    initState?: any,
    options?: any
  ): void;

  // Dispose the dispatch item
  dispose(): void;

  // Add the reference count
  _addRef(): void;

  // Derease the reference count
  _decreaseRef(): void;

  // Get this dispatch item's reference count
  getRefCount(): number;

  _stateKey: string | undefined;

  mapKey?: string;
  listIndex?: number;

  [key: string]: any;
}
