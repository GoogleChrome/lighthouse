import{b as u,c as S,d as w,e as M}from"./chunk-JTMITLSI.js";function h(t,o){if(t=JSON.parse(JSON.stringify(t)),!w(o))throw new Error(`Unsupported locale '${o}'`);let d=t.configSettings.locale,{icuMessagePaths:c}=t.i18n,f=[];if(!c)throw new Error("missing icuMessagePaths");for(let[g,y]of Object.entries(c))for(let e of y){let i,p;typeof e=="string"?i=e:(i=e.path,p=e.values);let s=i.replace(/\[([^\]]+)\]/g,".$1").replace(/^\./,"").split("."),n=t;for(let r=0;r<s.length-1;r++)n=n?.[s[r]];let m=s[s.length-1],a=n?.[m];if(typeof a!="string")continue;let l=S({i18nId:g,values:p,formattedDefault:a},o);if(l===a){o!==d&&f.push(g);continue}n[m]=l}return t.i18n.rendererFormattedStrings=u(o),t.configSettings.locale=o,{lhr:t,missingIcuMessageIds:f}}export{M as format,h as swapLocale};
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @license Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
