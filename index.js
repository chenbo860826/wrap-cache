// the following options could be defined
// - timeout: after which time (in ms) the cache shall be updated. It is undefined by default which implies no need to update
// - maxlive: after which time (in ms) the cache cannot be used. It is undefined by default which implies data gone 
//            immediately after timeout. It could be specified as negative (e.g. -1) to imply data available for ever.
// - finishtime: whether use finish time as time of the cache. It is false by default which implies use start time
function wrapCache(func, options) {
    // format cache and options
    let cache = {}; // <key, {data, time, promise}>
    options = options || {};
  
    function load(cachedData, args, current) {
      try {
        delete cachedData.error; // remove error before new round of load
        let result = func.apply(undefined, args); // try call func (Sync/Async)
        if (result instanceof Promise) {
          cachedData.promise = result;
          result.then((data) => {
            cachedData.data = data;
            cachedData.time = options.finishtime ? Date.now() : current;
            delete cachedData.promise;
          }).catch((error) => {
            // Do nothing but to suppress the exception. If some one cares the promise, it will wait
            delete cachedData.promise;
          })
        }
        else {
          cachedData.data = result;
          cachedData.time = options.finishtime ? Date.now() : current;
        }
      }
      catch (e) {
        // we don't throw error in load phase even for Sync loading. Leave it decided by upper policy
        cachedData.error = e;
      }
    }
  
    function add(args, data, time) {
      let cachedData = getCachedData(args);
      cachedData.data = data;
      cachedData.time = time || Date.now(); // allow customer specified time
      delete cachedData.promise; // It is safe to remove the promise because the already waiter waits for it. But we provide data to replace it.
    }
  
    function remove(args) {
      let cachedData = getCachedData(args);
      delete cachedData.time; // we simply invalidate the entry. It could still be handled by async loading.
    }
  
    function getCachedData(args) {
      let key = '';
      for (let i = 0; i < args.length; i++) {
        key += ',' + (args[i] instanceof Function ? args[i].name : args[i]);
      }
  
      let cachedData = cache[key];
      if (!cachedData) {
        cachedData = {};
        cache[key] = cachedData;
      }
  
      return cachedData;
    }
  
    function getAccessWrap(wrapOption) {
      let accessor = function () {
        // try get cachedItem
        let cachedData = getCachedData(arguments);
        let current = Date.now();
  
        // cachedData could be used if it is valid and didn't timeout
        if (cachedData.time && (wrapOption.timeout === null || wrapOption.timeout === undefined || current - cachedData.time < wrapOption.timeout)) {
          return cachedData.data;
        }
  
        // We will try trigger then. But we shall check promise then
        if (!cachedData.promise) {
          load(cachedData, arguments, current);
        }
  
        // If async is allowed and already loaded and no timeout defined or no worth timeout, we don't need to wait
        if (cachedData.time && (wrapOption.timeout === null || wrapOption.timeout === undefined || wrapOption.maxlive < 0 || (current - cachedData.time < wrapOption.timeout + (wrapOption.maxlive || 0)))) {
          return cachedData.data;
        }
  
        // return the promise if exist
        if (cachedData.promise) {
          return cachedData.promise;
        }
  
        // check if error happens
        if (cachedData.error) {
          throw cachedData.error;
        }
  
        // finally return latest value
        return cachedData.data;
      }
  
      accessor.wrap = getAccessWrap;
      accessor.add = add;
      accessor.remove = remove;
  
      return accessor;
    }
  
    return getAccessWrap(options);
  }
  
  module.exports = {
    wrapCache
  }