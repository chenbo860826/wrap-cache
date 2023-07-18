# wrap-cache

This document introduce the general concept to wrap a function into a cached one. It is less about the typical cache management algorithm such as LRU or cuckoo. It is more about how application defines the cache update policy.

## Cache Update Policy

There are three options could be used to configure how we update cached content in business logical level.

1. timeout: after which time (in ms) the cache shall be updated. It is undefined by default which implies no need to update.
2. maxlive: after which time (in ms) the timed out cache cannot be used. It is undefined by default which implies data gone immediately after timeout. It could be specified as negative (e.g. -1) to imply data available for ever.
3. finishtime: whether use cache loading finish time as time of the cache. It is false by default which implies use loading start time as time of cache.

According to combinations of timeout and maxlive, there are the following possibilities:

| timeout/maxlive | <0                                                           | 0 or null                                                    | >0                                                           |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| null            | **Never Update**: Cache never timeout, so cached content live forever after initial loading. | **Never Update** (as left)                                   | **Never Update** (as left)                                   |
| ?               | **Async Updater**: cached content timeout at some period, after which reload happens. But cached content could live forever, so it could be used immediately and cache update happens at background. | **Sync Updater**: cached content timeout and expire at the same period, caller have to wait until data updated. | **Timed Async Updater**: cached content could live a little time after timeout. It could still be used immediately within that time. But after that, caller have to wait data updating. |

## Interfaces

### wrapCache

Syntax:

```
wrapCache(func, options)
```

The interface to wrap a function is `wrapCache`.  It has the following arguments:

- func <Function>: the function for wrap. It could be either sync or async. The difference is -- the return of calling wrapped sync function will be the result and calling wrapped async function will return promise.
- options <Object>: options as introduced in above section

The return value is:

- <Function>: it will return the wrapped function. The wrapped function is a sync function. But it could return promise if original function is async one or returning promise.

Please follow the following example to wrap.

```
// declare original functions
async function getResult(a, b) {
	return a + b;
}

// wrap the cached function
const getCachedResult = wrapCache(getResult, { timeout: 5000, maxlive: 2000 });

// call cached function. await is necessary since original function is async function.
let result = await getCachedResult(1, 2);
```

### wrap

Syntax:

```
wrap(options)
```

wrap() is member function of wrapped function. It could wrap the cache again, and the newly wrapped function share the same cache with original wrapped function.

It has the following arguments:

- options <Object>: options as introduced in above section

The return value is:

- <Function>: it will return the wrapped function as introduced in above section.

Please follow the following example to wrap.

```
// declare original functions
async function getResult(a, b) {
	return a + b;
}

// wrap the cached function
const getCachedResult = wrapCache(getResult, { timeout: 5000, maxlive: 2000 });
const getAsyncResult = getCachedResult.wrap({ timeout: 5000 });

// call cached function. await is necessary since original function is async function.
let result = await getAsyncResult(1, 2);
```
