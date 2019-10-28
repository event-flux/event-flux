import LRU from "../LRU";

describe("LRU", () => {
  test("should get and put correctly", () => {
    let lruCache = new LRU(3);
    expect(lruCache.get("a")).toBe(undefined);
    expect(lruCache.take("a")).toBe(undefined);

    lruCache.put("a", 123);
    lruCache.put("b", 456);
    lruCache.put("c", 789);
    expect(lruCache.get("a")).toBe(123);

    let items: string[] = [];
    lruCache.forEach(node => items.push(node.key));
    expect(items).toEqual(["a", "c", "b"]);

    // Now max limit 3 is reached. Let's add a new element
    lruCache.put("d", 0);
    expect(lruCache.get("b")).toBe(undefined);
    expect(lruCache.size).toBe(3);

    items = [];
    lruCache.forEach(node => items.push(node.key));
    expect(items).toEqual(["d", "a", "c"]);

    items = [];
    for (let item of lruCache) {
      items.push(item.key);
    }
    expect(items).toEqual(["d", "a", "c"]);

    expect(lruCache.take("a")).toBe(123);
    expect(lruCache.get("a")).toBe(undefined);
  });
});
