/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent} from 'preact';

/* eslint-disable max-len */

const SummaryIcon: FunctionComponent = () => {
  return (
    <svg width="14" viewBox="0 0 18 16" fill="none" role="img">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M0 2C0 1.17 0.67 0.5 1.5 0.5C2.33 0.5 3 1.17 3 2C3 2.83 2.33 3.5 1.5 3.5C0.67 3.5 0 2.83 0 2ZM0 8C0 7.17 0.67 6.5 1.5 6.5C2.33 6.5 3 7.17 3 8C3 8.83 2.33 9.5 1.5 9.5C0.67 9.5 0 8.83 0 8ZM1.5 12.5C0.67 12.5 0 13.18 0 14C0 14.82 0.68 15.5 1.5 15.5C2.32 15.5 3 14.82 3 14C3 13.18 2.33 12.5 1.5 12.5ZM18 15H5V13H18V15ZM5 9H18V7H5V9ZM5 3V1H18V3H5Z" fill="currentColor"/>
    </svg>
  );
};

const NavigationIcon: FunctionComponent = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      role="img"
      aria-label="Icon representing a navigation report">
      <circle
        cx="8"
        cy="8"
        r="7"
        fill="none"
        stroke="currentColor"
        stroke-width="2"/>
    </svg>
  );
};

const TimespanIcon: FunctionComponent = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      role="img"
      aria-label="Icon representing a timespan report">
      <circle
        cx="8"
        cy="8"
        r="7"
        fill="none"
        stroke="currentColor"
        stroke-width="2"/>
      <path
        d="m 8,4 v 4 l 4,1.9999998"
        stroke="currentColor"
        stroke-width="1.5"/>
    </svg>
  );
};

const SnapshotIcon: FunctionComponent = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      role="img"
      aria-label="Icon representing a snapshot report">
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M 12.2038,12.2812 C 11.1212,13.3443 9.6372,14 8,14 7.81038,14 7.62281,13.9912 7.43768,13.974 L 10.3094,9 Z M 12.8925,11.4741 10.0207,6.5 H 13.811 C 13.9344,6.97943 14,7.48205 14,8 c 0,1.2947 -0.4101,2.4937 -1.1075,3.4741 z M 13.456,5.5 H 7.71135 L 9.6065,2.21749 C 11.3203,2.69259 12.7258,3.90911 13.456,5.5 Z M 8.5624,2.02601 C 8.3772,2.0088 8.1896,2 8,2 6.36282,2 4.8788,2.65572 3.79622,3.71885 L 5.69061,7.00002 Z M 3.10749,4.52594 C 2.4101,5.5063 2,6.70526 2,8 2,8.5179 2.06563,9.0206 2.18903,9.5 H 5.97927 Z M 2.54404,10.5 c 0.73017,1.5909 2.1357,2.8074 3.84949,3.2825 L 8.2887,10.5 Z M 16,8 c 0,4.4183 -3.5817,8 -8,8 C 3.58172,16 0,12.4183 0,8 0,3.58172 3.58172,0 8,0 c 4.4183,0 8,3.58172 8,8 z"
        fill="currentColor"/>
    </svg>
  );
};

const CloseIcon: FunctionComponent = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="24px"
      viewBox="0 0 24 24"
      width="24px"
      fill="currentColor"
      role="img"
      aria-label="Icon representing a close action"
    >
      <path d="M0 0h24v24H0V0z" fill="none" />
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
    </svg>
  );
};

const EnvIcon: FunctionComponent = () => {
  return (
    <svg width="15" height="12" viewBox="0 0 15 12" fill="none" role="img">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M3.33317 2.00008H13.9998V0.666748H3.33317C2.59984 0.666748 1.99984 1.26675 1.99984 2.00008V9.33341H0.666504V11.3334H7.99984V9.33341H3.33317V2.00008ZM13.9998 3.33341H9.99984C9.63317 3.33341 9.33317 3.63341 9.33317 4.00008V10.6667C9.33317 11.0334 9.63317 11.3334 9.99984 11.3334H13.9998C14.3665 11.3334 14.6665 11.0334 14.6665 10.6667V4.00008C14.6665 3.63341 14.3665 3.33341 13.9998 3.33341ZM10.6665 9.33341H13.3332V4.66675H10.6665V9.33341Z" fill="currentColor"/>
    </svg>
  );
};

const NetworkIcon: FunctionComponent = () => {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" role="img">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M0.666687 3.26663L2.00002 4.59997C3.92002 2.67997 6.52669 1.87997 9.02002 2.18663L9.81335 0.399966C6.59335 -0.173367 3.16002 0.779966 0.666687 3.26663ZM10.6 0.599966C10.4867 0.599966 10.3867 0.659966 10.3267 0.753299L10.28 0.853299L6.82669 8.61996C6.72002 8.8133 6.65335 9.02663 6.65335 9.25996C6.65335 9.99996 7.25335 10.6 7.99335 10.6C8.63335 10.6 9.17335 10.1466 9.30002 9.53996L9.30669 9.51997L10.9334 0.933299C10.9334 0.746633 10.7867 0.599966 10.6 0.599966ZM15.3334 3.26663L14 4.59997C13.1867 3.78663 12.2534 3.17997 11.2534 2.76663L11.6067 0.886633C12.9667 1.38663 14.24 2.1733 15.3334 3.26663ZM11.3334 7.26663L12.6667 5.9333C12.1334 5.39997 11.5334 4.98663 10.8934 4.6733L10.5267 6.61997C10.8067 6.79997 11.08 7.0133 11.3334 7.26663ZM4.66669 7.26663L3.33335 5.9333C4.67335 4.5933 6.45335 3.95997 8.20669 4.0133L7.35335 5.9333C6.37335 6.0733 5.42002 6.5133 4.66669 7.26663Z" fill="currentColor"/>
    </svg>
  );
};

const CpuIcon: FunctionComponent = () => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" role="img">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M15.5 7.16667V5.5H13.8333V3.83333C13.8333 2.91667 13.0833 2.16667 12.1667 2.16667H10.5V0.5H8.83333V2.16667H7.16667V0.5H5.5V2.16667H3.83333C2.91667 2.16667 2.16667 2.91667 2.16667 3.83333V5.5H0.5V7.16667H2.16667V8.83333H0.5V10.5H2.16667V12.1667C2.16667 13.0833 2.91667 13.8333 3.83333 13.8333H5.5V15.5H7.16667V13.8333H8.83333V15.5H10.5V13.8333H12.1667C13.0833 13.8333 13.8333 13.0833 13.8333 12.1667V10.5H15.5V8.83333H13.8333V7.16667H15.5ZM10.5 5.5H5.5V10.5H10.5V5.5ZM3.83333 12.1667H12.1667V3.83333H3.83333V12.1667Z" fill="currentColor"/>
    </svg>
  );
};

const HamburgerIcon: FunctionComponent = () => {
  return (
    <svg viewBox="0 0 18 12" width="18" height="12" role="img">
      <rect width="18" height="2" fill="currentColor"></rect>
      <rect y="5" width="18" height="2" fill="currentColor"></rect>
      <rect y="10" width="18" height="2" fill="currentColor"></rect>
    </svg>
  );
};

const InfoIcon: FunctionComponent = () => {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M13 7C13 10.3137 10.3137 13 7 13C3.68629 13 1 10.3137 1 7C1 3.68629 3.68629 1 7 1C10.3137 1 13 3.68629 13 7ZM14 7C14 10.866 10.866 14 7 14C3.13401 14 0 10.866 0 7C0 3.13401 3.13401 0 7 0C10.866 0 14 3.13401 14 7ZM7.66658 11H6.33325V9.66667H7.66658V11ZM4.33325 5.66667C4.33325 4.19333 5.52659 3 6.99992 3C8.47325 3 9.66658 4.19333 9.66658 5.66667C9.66658 6.52194 9.1399 6.98221 8.62709 7.43036C8.1406 7.85551 7.66658 8.26975 7.66658 9H6.33325C6.33325 7.78582 6.96133 7.30439 7.51355 6.88112C7.94674 6.54907 8.33325 6.25281 8.33325 5.66667C8.33325 4.93333 7.73325 4.33333 6.99992 4.33333C6.26658 4.33333 5.66658 4.93333 5.66658 5.66667H4.33325Z" fill="currentColor"/>
    </svg>
  );
};

export {
  SummaryIcon,
  NavigationIcon,
  TimespanIcon,
  SnapshotIcon,
  CloseIcon,
  EnvIcon,
  NetworkIcon,
  CpuIcon,
  HamburgerIcon,
  InfoIcon,
};
