
export default interface DispatchParent {
  setState(state: any): void;

  forceUpdate(): void;
}