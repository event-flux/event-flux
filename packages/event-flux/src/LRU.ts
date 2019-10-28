export class LRUNode<T> {
  key: string;
  value: T;
  prev: LRUNode<T> | undefined;
  next: LRUNode<T> | undefined;

  constructor(key: string, value: T, next?: LRUNode<T>, prev?: LRUNode<T>) {
    this.key = key;
    this.value = value;
    this.prev = prev;
    this.next = next;
  }
}

type OnExceedRemove = (key: string) => void;

export default class LRU<T> {
  size: number;
  limit: number;
  head: LRUNode<T> | undefined;
  tail: LRUNode<T> | undefined;
  cache: { [key: string]: any };
  onExceedRemove: undefined | OnExceedRemove;

  //set default limit of 10 if limit is not passed.
  constructor(limit = 10, onExceedRemove?: (key: string) => void) {
    this.size = 0;
    this.limit = limit;
    this.cache = {};
    this.onExceedRemove = onExceedRemove;
  }

  // Write Node to head of LinkedList
  // update cache with Node key and Node reference
  put(key: string, value: T) {
    this.ensureLimit();

    if (!this.head) {
      this.head = this.tail = new LRUNode(key, value);
    } else {
      const node = new LRUNode(key, value, this.head);
      this.head.prev = node;
      this.head = node;
    }

    //Update the cache map
    this.cache[key] = this.head;
    this.size++;
  }

  take(key: string) {
    if (this.cache[key]) {
      const value = this.cache[key].value;

      // node removed from it's position and cache
      this.remove(key);

      return value;
    }
    return undefined;
  }

  // Get from cache map and make that node as new Head of LinkedList
  get(key: string) {
    if (this.cache[key]) {
      const value = this.cache[key].value;

      // node removed from it's position and cache
      this.remove(key);
      // write node again to the head of LinkedList to make it most recently used
      this.put(key, value);

      return value;
    }
    return undefined;
  }

  ensureLimit() {
    if (this.size >= this.limit) {
      let key = this.tail!.key;
      this.remove(key);
      this.onExceedRemove && this.onExceedRemove(key);
    }
  }

  remove(key: string) {
    const node = this.cache[key];

    if (node.prev !== undefined) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next !== undefined) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    delete this.cache[key];
    this.size--;
  }

  clear() {
    this.head = undefined;
    this.tail = undefined;
    this.size = 0;
    this.cache = {};
  }

  // Invokes the callback function with every node of the chain and the index of the node.
  forEach(fn: (node: LRUNode<T>, index: number) => void) {
    let node = this.head;
    let counter = 0;
    while (node) {
      fn(node, counter);
      node = node.next;
      counter++;
    }
  }

  // To iterate over LRU with a 'for...of' loop
  *[Symbol.iterator]() {
    let node = this.head;
    while (node) {
      yield node;
      node = node.next;
    }
  }
}
