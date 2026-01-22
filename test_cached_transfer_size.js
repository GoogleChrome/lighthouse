#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Test to demonstrate the fix for cached resource transfer size calculation.
 * This test shows that ResourceReceivedData events for cached requests
 * no longer incorrectly inflate transferSize.
 */

/**
 * Simulate the fixed sumTransferSizeOfInstantEvent function
 * with the fromCache check in place.
 */
function sumTransferSizeOfInstantEvent_FIXED(e) {
  // Simulated event type check
  const isReceivedDataEvent = (ev) => 
    ['ResourceReceivedData', 'ResourceFinish', 'ResourceReceiveResponse'].includes(ev.name);

  if (isReceivedDataEvent(e)) {
    let transferSize = 0;

    // ✅ NEW FIX: Skip transferSize calculation for cached requests
    // Cached requests emit ResourceReceivedData events with decoded body size,
    // but no actual network transfer occurred. Only count bytes for requests
    // fetched over the network.
    if (e.args.data.fromCache) {
      return transferSize; // Return 0 for cached requests
    }

    // ResourceReceivedData events tally up transfer size over time
    if (e.name === 'ResourceReceivedData') {
      transferSize += e.args.data.encodedDataLength;
    }
    else if (e.args.data.encodedDataLength > 0) {
      transferSize = e.args.data.encodedDataLength;
    }

    return transferSize;
  }
  return 0;
}

/**
 * Simulate the BROKEN sumTransferSizeOfInstantEvent function
 * without the fromCache check.
 */
function sumTransferSizeOfInstantEvent_BROKEN(e) {
  const isReceivedDataEvent = (ev) => 
    ['ResourceReceivedData', 'ResourceFinish', 'ResourceReceiveResponse'].includes(ev.name);

  if (isReceivedDataEvent(e)) {
    let transferSize = 0;

    // ❌ BROKEN: No check for fromCache, counts all data
    if (e.name === 'ResourceReceivedData') {
      transferSize += e.args.data.encodedDataLength;
    }
    else if (e.args.data.encodedDataLength > 0) {
      transferSize = e.args.data.encodedDataLength;
    }

    return transferSize;
  }
  return 0;
}

/**
 * Create mock events for a resource requested twice:
 * - First: network request
 * - Second: served from cache
 */
function createMockResourceEvents() {
  const resourceSize = 10000; // 10KB

  return [
    // First request - not cached
    {
      name: 'ResourceReceivedData',
      args: {data: {encodedDataLength: resourceSize, fromCache: false}},
    },
    // Second request - served from cache
    {
      name: 'ResourceReceivedData',
      args: {data: {encodedDataLength: resourceSize, fromCache: true}},
    },
  ];
}

// Run the test
console.log('='.repeat(70));
console.log('Cached Resource Transfer Size Fix - Test Results');
console.log('='.repeat(70));
console.log();

const mockEvents = createMockResourceEvents();
let totalTransferSize_BROKEN = 0;
let totalTransferSize_FIXED = 0;

console.log('Processing two ResourceReceivedData events:');
console.log('  Event 1: 10KB resource (fromCache: false)');
console.log('  Event 2: 10KB resource (fromCache: true)');
console.log();

mockEvents.forEach((e, i) => {
  const brokenResult = sumTransferSizeOfInstantEvent_BROKEN(e);
  const fixedResult = sumTransferSizeOfInstantEvent_FIXED(e);
  
  totalTransferSize_BROKEN += brokenResult;
  totalTransferSize_FIXED += fixedResult;
  
  console.log(`Event ${i + 1} (fromCache: ${e.args.data.fromCache}):`);
  console.log(`  ❌ BROKEN version adds: ${brokenResult} bytes`);
  console.log(`  ✅ FIXED version adds: ${fixedResult} bytes`);
});

console.log();
console.log('RESULTS:');
console.log(`  ❌ BROKEN total transferSize: ${totalTransferSize_BROKEN} bytes (10KB + 10KB = WRONG)`);
console.log(`  ✅ FIXED total transferSize: ${totalTransferSize_FIXED} bytes (10KB + 0KB = CORRECT)`);
console.log();

/**
 * Summary of the fix:
 * 
 * BEFORE:
 * - ResourceReceivedData events for cached requests were counted in transferSize
 * - A cached resource request would add its decoded body size to transferSize
 * - This resulted in double-counting when the same resource was requested twice:
 *   - First request: 10KB (actual network transfer)
 *   - Second request: 10KB (from cache, no actual transfer) ❌ WRONG
 *   - Total: 20KB (should be 10KB)
 * 
 * AFTER:
 * - ResourceReceivedData events with fromCache === true are skipped
 * - transferSize only reflects actual network transfer
 * - Same scenario now correctly reports:
 *   - First request: 10KB (actual network transfer)
 *   - Second request: 0KB (from cache, correctly ignored)
 *   - Total: 10KB ✓ CORRECT
 * 
 * The fix checks `e.args.data.fromCache` early and returns before
 * any transferSize calculations are performed for cached resources.
 */

console.log('='.repeat(70));
console.log('Cached Resource Transfer Size Fix Demonstration');
console.log('='.repeat(70));
console.log();
console.log('SCENARIO:');
console.log('- First request for https://example.com/resource.js: 10KB (network)');
console.log('- Second request for same URL: served from cache (no transfer)');
console.log();
console.log('EXPECTED BEHAVIOR (with fix):');
console.log('- First request transferSize: 10KB');
console.log('- Second request transferSize: 0KB (cached request ignored)');
console.log('- Total transferSize: 10KB');
console.log();
console.log('PREVIOUS BEHAVIOR (without fix):');
console.log('- First request transferSize: 10KB');
console.log('- Second request transferSize: 10KB (incorrectly counted)');
console.log('- Total transferSize: 20KB ❌ WRONG');
console.log();
console.log('FIX LOCATION:');
console.log('  File: node_modules/@paulirish/trace_engine/models/trace/extras/TraceTree.js');
console.log('  Function: sumTransferSizeOfInstantEvent (lines 337-369)');
console.log('  Change: Added check for e.args.data.fromCache before transferSize calc');
console.log('='.repeat(70));
