# Fix for Lighthouse Third-Parties-Insight Cached Resource Bug

## Problem

The `third-parties-insight` audit was misreporting `transferSize` when the same third-party resource was requested multiple times with subsequent requests served from cache.

### Root Cause

In `node_modules/@paulirish/trace_engine/models/trace/extras/TraceTree.js`, the `sumTransferSizeOfInstantEvent` function processes `ResourceReceivedData` events without checking if the request was served from cache (`fromCache === true`).

When a resource is served from cache:
- Chrome DevTools still emits `ResourceReceivedData` events
- These events contain the `fromCache: true` flag
- The events have `encodedDataLength` set to the decoded body size
- **However**, no actual network transfer occurred

**Without the fix**: The decoded body size was incorrectly added to `transferSize`, inflating the metric.

### Example Scenario

1. User requests `https://cdn.example.com/script.js` (10KB)
   - Actual network transfer: 10KB
   - `transferSize` reported: 10KB ✓

2. User requests the same URL again within cache TTL
   - No network transfer (served from browser cache)
   - `ResourceReceivedData` event emitted with `encodedDataLength: 10000`, `fromCache: true`
   - **Without fix**: `transferSize` incorrectly adds 10KB ❌
   - **Total**: 20KB (should be 10KB)

## Solution

Added an early return check in `sumTransferSizeOfInstantEvent` to skip `transferSize` calculations for cached requests:

### Change Details

**File**: `node_modules/@paulirish/trace_engine/models/trace/extras/TraceTree.js`  
**Function**: `sumTransferSizeOfInstantEvent` (lines 337-369)  
**Change Type**: Add cache check before transferSize calculation

```javascript
// Skip transferSize calculation for cached requests. Cached requests emit
// ResourceReceivedData events with decoded body size, but no actual network
// transfer occurred. Only count bytes for requests fetched over the network.
if (e.args.data.fromCache) {
    return;
}
```

This check is placed immediately after the node is created/retrieved, before any `transferSize` modifications occur.

## Impact

### What Changed
- ✅ Cached requests no longer inflate `transferSize`
- ✅ Network transfer metrics now reflect actual bytes transferred over the network
- ✅ `third-parties-insight` audit now aligns with `network-requests` audit behavior

### What Didn't Change
- ✅ Non-cached request handling is unchanged
- ✅ No breaking changes to the public API
- ✅ Minimal, safe code change with clear documentation

## Testing

### Manual Test Results

Test scenario: Two `ResourceReceivedData` events for the same resource
- Event 1: 10KB, `fromCache: false`
- Event 2: 10KB, `fromCache: true`

**BEFORE FIX:**
```
Event 1: +10KB ✓
Event 2: +10KB ❌ (should be 0KB)
Total: 20KB (WRONG)
```

**AFTER FIX:**
```
Event 1: +10KB ✓
Event 2: +0KB ✓ (correctly ignored)
Total: 10KB (CORRECT)
```

## Related Code

The fix aligns with how the `NetworkRequestsHandler` already identifies cached requests:

```javascript
// From NetworkRequestsHandler.js (line 201)
const isDiskCached = !!request.receiveResponse && 
                     request.receiveResponse.args.data.fromCache &&
                     !request.receiveResponse.args.data.fromServiceWorker && 
                     !isPushedResource;
```

## Verification

The fix:
1. ✅ Correctly identifies cached requests via `e.args.data.fromCache`
2. ✅ Prevents double-counting of cached resource sizes
3. ✅ Maintains proper handling of non-cached requests
4. ✅ Uses clear, documented logic with code comments

## Browser Compatibility

The `fromCache` property is a standard Chrome DevTools Protocol field available in:
- Chrome/Chromium 60+ (ResourceReceiveResponse events)
- Edge (same as Chromium)
- All modern versions of Chrome/Edge used by Lighthouse
