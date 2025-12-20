/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare global {
  module LH {
    /**
     * The performance budget interface.
     * More info: https://github.com/GoogleChrome/budget.json
     */
    export interface Budget {
      /** Budget options */
      options?: Budget.Options;
      /**
       * Indicates which pages a budget applies to. Uses the robots.txt format.
       * If it is not supplied, the budget applies to all pages.
       * More info on robots.txt: https://developers.google.com/search/reference/robots_txt#url-matching-based-on-path-values
       */
      path?: string;
      /** Budgets based on resource count. */
      resourceCounts?: Array<Budget.ResourceBudget>;
      /** Budgets based on resource size. */
      resourceSizes?: Array<Budget.ResourceBudget>;
      /** Budgets based on timing metrics. */
      timings?: Array<Budget.TimingBudget>;
    }

    module Budget {
      export interface ResourceBudget {
        /** The resource type that a budget applies to. */
        resourceType: ResourceType;
        /** Budget for resource. Depending on context, this is either the count or size (KB) of a resource. */
        budget: number;
      }

      export interface TimingBudget {
        /** The type of timing metric. */
        metric: TimingMetric;
        /** Budget for timing measurement, in milliseconds. */
        budget: number;
      }

      export interface Options {
        /**
         * List of hostnames used to classify resources as 1st or 3rd party.
         * Wildcards can optionally be used to match a hostname and all of its subdomains.
         * For example e.g.: "*.news.gov.uk" matches both "news.gov.uk" and "en.news.gov.uk"
         * If this property is not set, the root domain and all its subdomains are considered first party.
         */
        firstPartyHostnames?: Array<string>;
      }

      /** Supported timing metrics. */
      export type TimingMetric = 'first-contentful-paint' | 'first-cpu-idle' | 'interactive' | 'first-meaningful-paint' | 'max-potential-fid' | 'estimated-input-latency' | 'total-blocking-time' | 'speed-index' | 'largest-contentful-paint' | 'cumulative-layout-shift';

      /** Supported values for the resourceType property of a ResourceBudget. */
      export type ResourceType = 'stylesheet' | 'image' | 'media' | 'font' | 'script' | 'document' | 'other' | 'total' | 'third-party';
    }
  }
}

// empty export to keep file a module
export {}
