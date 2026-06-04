var n,u,i,t,r,o,e={},c=[],s=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord/i;function a(n,l){for(var u in l){ n[u]=l[u]; }return n}function v(n){var l=n.parentNode;l&&l.removeChild(n);}function h(n,l,u){var i,t=arguments,r={};for(i in l){ "key"!==i&&"ref"!==i&&(r[i]=l[i]); }if(arguments.length>3){ for(u=[u],i=3;i<arguments.length;i++){ u.push(t[i]); } }if(null!=u&&(r.children=u),"function"==typeof n&&null!=n.defaultProps){ for(i in n.defaultProps){ void 0===r[i]&&(r[i]=n.defaultProps[i]); } }return p(n,r,l&&l.key,l&&l.ref,null)}function p(l,u,i,t,r){var o={type:l,props:u,key:i,ref:t,__k:null,__:null,__b:0,__e:null,__d:void 0,__c:null,constructor:void 0,__v:r};return null==r&&(o.__v=o),n.vnode&&n.vnode(o),o}function y(){return {}}function d(n){return n.children}function m(n,l){this.props=n,this.context=l;}function w(n,l){if(null==l){ return n.__?w(n.__,n.__.__k.indexOf(n)+1):null; }for(var u;l<n.__k.length;l++){ if(null!=(u=n.__k[l])&&null!=u.__e){ return u.__e; } }return "function"==typeof n.type?w(n):null}function k(n){var l,u;if(null!=(n=n.__)&&null!=n.__c){for(n.__e=n.__c.base=null,l=0;l<n.__k.length;l++){ if(null!=(u=n.__k[l])&&null!=u.__e){n.__e=n.__c.base=u.__e;break} }return k(n)}}function g(l){(!l.__d&&(l.__d=!0)&&u.push(l)&&!i++||r!==n.debounceRendering)&&((r=n.debounceRendering)||t)(_);}function _(){for(var n;i=u.length;){ n=u.sort(function(n,l){return n.__v.__b-l.__v.__b}),u=[],n.some(function(n){var l,u,i,t,r,o,f;n.__d&&(o=(r=(l=n).__v).__e,(f=l.__P)&&(u=[],(i=a({},r)).__v=i,t=A(f,r,i,l.__n,void 0!==f.ownerSVGElement,null,u,null==o?w(r):o),T(u,r),t!=o&&k(r)));}); }}function b(n,l,u,i,t,r,o,f,s){var a,h,p,y,d,m,k,g=u&&u.__k||c,_=g.length;if(f==e&&(f=null!=r?r[0]:_?w(u,0):null),a=0,l.__k=x(l.__k,function(u){if(null!=u){if(u.__=l,u.__b=l.__b+1,null===(p=g[a])||p&&u.key==p.key&&u.type===p.type){ g[a]=void 0; }else { for(h=0;h<_;h++){if((p=g[h])&&u.key==p.key&&u.type===p.type){g[h]=void 0;break}p=null;} }if(y=A(n,u,p=p||e,i,t,r,o,f,s),(h=u.ref)&&p.ref!=h&&(k||(k=[]),p.ref&&k.push(p.ref,null,u),k.push(h,u.__c||y,u)),null!=y){var c;if(null==m&&(m=y),void 0!==u.__d){ c=u.__d,u.__d=void 0; }else if(r==p||y!=f||null==y.parentNode){n:if(null==f||f.parentNode!==n){ n.appendChild(y),c=null; }else {for(d=f,h=0;(d=d.nextSibling)&&h<_;h+=2){ if(d==y){ break n; } }n.insertBefore(y,f),c=f;}"option"==l.type&&(n.value="");}f=void 0!==c?c:y.nextSibling,"function"==typeof l.type&&(l.__d=f);}else { f&&p.__e==f&&f.parentNode!=n&&(f=w(p)); }}return a++,u}),l.__e=m,null!=r&&"function"!=typeof l.type){ for(a=r.length;a--;){ null!=r[a]&&v(r[a]); } }for(a=_;a--;){ null!=g[a]&&D(g[a],g[a]); }if(k){ for(a=0;a<k.length;a++){ j(k[a],k[++a],k[++a]); } }}function x(n,l,u){if(null==u&&(u=[]),null==n||"boolean"==typeof n){ l&&u.push(l(null)); }else if(Array.isArray(n)){ for(var i=0;i<n.length;i++){ x(n[i],l,u); } }else { u.push(l?l("string"==typeof n||"number"==typeof n?p(null,n,null,null,n):null!=n.__e||null!=n.__c?p(n.type,n.props,n.key,null,n.__v):n):n); }return u}function P(n,l,u,i,t){var r;for(r in u){ "children"===r||"key"===r||r in l||N(n,r,null,u[r],i); }for(r in l){ t&&"function"!=typeof l[r]||"children"===r||"key"===r||"value"===r||"checked"===r||u[r]===l[r]||N(n,r,l[r],u[r],i); }}function C(n,l,u){"-"===l[0]?n.setProperty(l,u):n[l]="number"==typeof u&&!1===s.test(l)?u+"px":null==u?"":u;}function N(n,l,u,i,t){var r,o,f,e,c;if(t?"className"===l&&(l="class"):"class"===l&&(l="className"),"style"===l){ if(r=n.style,"string"==typeof u){ r.cssText=u; }else {if("string"==typeof i&&(r.cssText="",i=null),i){ for(e in i){ u&&e in u||C(r,e,""); } }if(u){ for(c in u){ i&&u[c]===i[c]||C(r,c,u[c]); } }} }else { "o"===l[0]&&"n"===l[1]?(o=l!==(l=l.replace(/Capture$/,"")),f=l.toLowerCase(),l=(f in n?f:l).slice(2),u?(i||n.addEventListener(l,z,o),(n.l||(n.l={}))[l]=u):n.removeEventListener(l,z,o)):"list"!==l&&"tagName"!==l&&"form"!==l&&"type"!==l&&"size"!==l&&!t&&l in n?n[l]=null==u?"":u:"function"!=typeof u&&"dangerouslySetInnerHTML"!==l&&(l!==(l=l.replace(/^xlink:?/,""))?null==u||!1===u?n.removeAttributeNS("http://www.w3.org/1999/xlink",l.toLowerCase()):n.setAttributeNS("http://www.w3.org/1999/xlink",l.toLowerCase(),u):null==u||!1===u&&!/^ar/.test(l)?n.removeAttribute(l):n.setAttribute(l,u)); }}function z(l){this.l[l.type](n.event?n.event(l):l);}function A(l,u,i,t,r,o,f,e,c){var s,v,h,p,y,w,k,g,_,x,P=u.type;if(void 0!==u.constructor){ return null; }(s=n.__b)&&s(u);try{n:if("function"==typeof P){if(g=u.props,_=(s=P.contextType)&&t[s.__c],x=s?_?_.props.value:s.__:t,i.__c?k=(v=u.__c=i.__c).__=v.__E:("prototype"in P&&P.prototype.render?u.__c=v=new P(g,x):(u.__c=v=new m(g,x),v.constructor=P,v.render=E),_&&_.sub(v),v.props=g,v.state||(v.state={}),v.context=x,v.__n=t,h=v.__d=!0,v.__h=[]),null==v.__s&&(v.__s=v.state),null!=P.getDerivedStateFromProps&&(v.__s==v.state&&(v.__s=a({},v.__s)),a(v.__s,P.getDerivedStateFromProps(g,v.__s))),p=v.props,y=v.state,h){ null==P.getDerivedStateFromProps&&null!=v.componentWillMount&&v.componentWillMount(),null!=v.componentDidMount&&v.__h.push(v.componentDidMount); }else {if(null==P.getDerivedStateFromProps&&g!==p&&null!=v.componentWillReceiveProps&&v.componentWillReceiveProps(g,x),!v.__e&&null!=v.shouldComponentUpdate&&!1===v.shouldComponentUpdate(g,v.__s,x)||u.__v===i.__v&&!v.__){for(v.props=g,v.state=v.__s,u.__v!==i.__v&&(v.__d=!1),v.__v=u,u.__e=i.__e,u.__k=i.__k,v.__h.length&&f.push(v),s=0;s<u.__k.length;s++){ u.__k[s]&&(u.__k[s].__=u); }break n}null!=v.componentWillUpdate&&v.componentWillUpdate(g,v.__s,x),null!=v.componentDidUpdate&&v.__h.push(function(){v.componentDidUpdate(p,y,w);});}v.context=x,v.props=g,v.state=v.__s,(s=n.__r)&&s(u),v.__d=!1,v.__v=u,v.__P=l,s=v.render(v.props,v.state,v.context),u.__k=null!=s&&s.type==d&&null==s.key?s.props.children:Array.isArray(s)?s:[s],null!=v.getChildContext&&(t=a(a({},t),v.getChildContext())),h||null==v.getSnapshotBeforeUpdate||(w=v.getSnapshotBeforeUpdate(p,y)),b(l,u,i,t,r,o,f,e,c),v.base=u.__e,v.__h.length&&f.push(v),k&&(v.__E=v.__=null),v.__e=!1;}else { null==o&&u.__v===i.__v?(u.__k=i.__k,u.__e=i.__e):u.__e=$$1(i.__e,u,i,t,r,o,f,c); }(s=n.diffed)&&s(u);}catch(l){u.__v=null,n.__e(l,u,i);}return u.__e}function T(l,u){n.__c&&n.__c(u,l),l.some(function(u){try{l=u.__h,u.__h=[],l.some(function(n){n.call(u);});}catch(l){n.__e(l,u.__v);}});}function $$1(n,l,u,i,t,r,o,f){var s,a,v,h,p,y=u.props,d=l.props;if(t="svg"===l.type||t,null!=r){ for(s=0;s<r.length;s++){ if(null!=(a=r[s])&&((null===l.type?3===a.nodeType:a.localName===l.type)||n==a)){n=a,r[s]=null;break} } }if(null==n){if(null===l.type){ return document.createTextNode(d); }n=t?document.createElementNS("http://www.w3.org/2000/svg",l.type):document.createElement(l.type,d.is&&{is:d.is}),r=null,f=!1;}if(null===l.type){ y!==d&&n.data!=d&&(n.data=d); }else {if(null!=r&&(r=c.slice.call(n.childNodes)),v=(y=u.props||e).dangerouslySetInnerHTML,h=d.dangerouslySetInnerHTML,!f){if(y===e){ for(y={},p=0;p<n.attributes.length;p++){ y[n.attributes[p].name]=n.attributes[p].value; } }(h||v)&&(h&&v&&h.__html==v.__html||(n.innerHTML=h&&h.__html||""));}P(n,d,y,t,f),h?l.__k=[]:(l.__k=l.props.children,b(n,l,u,i,"foreignObject"!==l.type&&t,r,o,e,f)),f||("value"in d&&void 0!==(s=d.value)&&s!==n.value&&N(n,"value",s,y.value,!1),"checked"in d&&void 0!==(s=d.checked)&&s!==n.checked&&N(n,"checked",s,y.checked,!1));}return n}function j(l,u,i){try{"function"==typeof l?l(u):l.current=u;}catch(l){n.__e(l,i);}}function D(l,u,i){var t,r,o;if(n.unmount&&n.unmount(l),(t=l.ref)&&(t.current&&t.current!==l.__e||j(t,null,u)),i||"function"==typeof l.type||(i=null!=(r=l.__e)),l.__e=l.__d=void 0,null!=(t=l.__c)){if(t.componentWillUnmount){ try{t.componentWillUnmount();}catch(l){n.__e(l,u);} }t.base=t.__P=null;}if(t=l.__k){ for(o=0;o<t.length;o++){ t[o]&&D(t[o],u,i); } }null!=r&&v(r);}function E(n,l,u){return this.constructor(n,u)}function H(l,u,i){var t,r,f;n.__&&n.__(l,u),r=(t=i===o)?null:i&&i.__k||u.__k,l=h(d,null,[l]),f=[],A(u,(t?u:i||u).__k=l,r||e,e,void 0!==u.ownerSVGElement,i&&!t?[i]:r?null:c.slice.call(u.childNodes),f,i||e,t),T(f,l);}n={__e:function(n,l){for(var u,i;l=l.__;){ if((u=l.__c)&&!u.__){ try{if(u.constructor&&null!=u.constructor.getDerivedStateFromError&&(i=!0,u.setState(u.constructor.getDerivedStateFromError(n))),null!=u.componentDidCatch&&(i=!0,u.componentDidCatch(n)),i){ return g(u.__E=u) }}catch(l){n=l;} } }throw n}},m.prototype.setState=function(n,l){var u;u=this.__s!==this.state?this.__s:this.__s=a({},this.state),"function"==typeof n&&(n=n(u,this.props)),n&&a(u,n),null!=n&&this.__v&&(l&&this.__h.push(l),g(this));},m.prototype.forceUpdate=function(n){this.__v&&(this.__e=!0,n&&this.__h.push(n),g(this));},m.prototype.render=d,u=[],i=0,t="function"==typeof Promise?Promise.prototype.then.bind(Promise.resolve()):setTimeout,o=e,0;

/**
 * Approximates the Gauss error function, the probability that a random variable
 * from the standard normal distribution lies within [-x, x]. Moved from
 * traceviewer.b.math.erf, based on Abramowitz and Stegun, formula 7.1.26.
 * @param {number} x
 * @return {number}
 */
function internalErf_(x) {
  // erf(-x) = -erf(x);
  var sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  var a1 = 0.254829592;
  var a2 = -0.284496736;
  var a3 = 1.421413741;
  var a4 = -1.453152027;
  var a5 = 1.061405429;
  var p = 0.3275911;
  var t = 1 / (1 + p * x);
  var y = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
  return sign * (1 - y * Math.exp(-x * x));
}

/**
 * Creates a log-normal distribution and finds the complementary
 * quantile (1-percentile) of that distribution at value. All
 * arguments should be in the same units (e.g. milliseconds).
 *
 * @param {{median: number, podr?: number, p10?: number}} curve
 * @param {number} value
 * @return The complement of the quantile at value.
 * @customfunction
 */
function QUANTILE_AT_VALUE({median, podr, p10}, value) {
  if (!podr) {
    podr = derivePodrFromP10(median, p10);
  }

  var location = Math.log(median);

  // The "podr" value specified the location of the smaller of the positive
  // roots of the third derivative of the log-normal CDF. Calculate the shape
  // parameter in terms of that value and the median.
  // See https://www.desmos.com/calculator/2t1ugwykrl
  var logRatio = Math.log(podr / median);
  var shape = Math.sqrt(1 - 3 * logRatio - Math.sqrt((logRatio - 3) * (logRatio - 3) - 8)) / 2;

  var standardizedX = (Math.log(value) - location) / (Math.SQRT2 * shape);
  return (1 - internalErf_(standardizedX)) / 2;
}

/**
 * Approximates the inverse error function. Based on Winitzki, "A handy
 * approximation for the error function and its inverse"
 * @param {number} x
 * @return {number}
 */
function internalErfInv_(x) {
  // erfinv(-x) = -erfinv(x);
  var sign = x < 0 ? -1 : 1;
  var a = 0.147;

  var log1x = Math.log(1 - x*x);
  var p1 = 2 / (Math.PI * a) + log1x / 2;
  var sqrtP1Log = Math.sqrt(p1 * p1 - (log1x / a));
  return sign * Math.sqrt(sqrtP1Log - p1);
}

/**
 * Calculates the value at the given quantile. Median, podr, and
 * expected value should all be in the same units (e.g. milliseconds).
 * quantile should be within [0,1].
 *
 * @param {{median: number, podr?: number, p10?: number}} curve
 * @return The value at this quantile.
 * @customfunction
 */
function VALUE_AT_QUANTILE({median, podr, p10}, quantile) {
  if (!podr) {
    podr = derivePodrFromP10(median, p10);
  }

  var location = Math.log(median);
  var logRatio = Math.log(podr / median);
  var shape = Math.sqrt(1 - 3 * logRatio - Math.sqrt((logRatio - 3) * (logRatio - 3) - 8)) / 2;

  return Math.exp(location + shape * Math.SQRT2 * internalErfInv_(1 - 2 * quantile));
}

// https://www.desmos.com/calculator/oqlvmezbze
function derivePodrFromP10(median, p10) {
  const u = Math.log(median);
  const shape = Math.abs(Math.log(p10) - u) / (Math.SQRT2 * 0.9061938024368232);
  const inner1 = -3 * shape - Math.sqrt(4 + shape * shape);
  const podr = Math.exp(u + shape/2 * inner1);
  return podr;
}

// blingjs
const $ = document.querySelector.bind(document);
document.querySelectorAll.bind(document);

Element.prototype.$ = Element.prototype.querySelector;
Element.prototype.$$ = Element.prototype.querySelectorAll;

const NBSP = '\xa0';
const numberFormatter = new Intl.NumberFormat();

// thx Lighthouse's util.js
function arithmeticMean(items) {
  items = items.filter(item => item.weight > 0);
  const results = items.reduce(
    (result, item) => {
      const score = item.result.score;
      const weight = item.weight;
      return {
        weight: result.weight + weight,
        sum: result.sum + score * weight,
      };
    },
    {weight: 0, sum: 0}
  );
  return results.sum / results.weight || 0;
}

function calculateRating(score) {
	const RATINGS = {
		PASS: {label: 'pass', minScore: 0.9},
		AVERAGE: {label: 'average', minScore: 0.5},
		FAIL: {label: 'fail'},
	};

  let rating = RATINGS.FAIL.label;
  if (score >= RATINGS.PASS.minScore) {
    rating = RATINGS.PASS.label;
  } else if (score >= RATINGS.AVERAGE.minScore) {
    rating = RATINGS.AVERAGE.label;
  }
  return rating;
}

const metrics = {
  FCP: {auditId: 'first-contentful-paint', name: 'First Contentful Paint'},
  SI: {auditId: 'speed-index', name: 'Speed Index'},
  LCP: {auditId: 'largest-contentful-paint', name: 'Largest Contentful Paint'},
  TTI: {auditId: 'interactive', name: 'Time to Interactive'},
  TBT: {auditId: 'total-blocking-time', name: 'Total Blocking Time'},
  CLS: {auditId: 'cumulative-layout-shift', name: 'Cumulative Layout Shift', units: 'unitless'},
  FMP: {auditId: 'first-meaningful-paint', name: 'First Meaningful Paint'},
  FCI: {auditId: 'first-cpu-idle', name: 'First CPU Idle'},
};

const curves = {
  v10: {
    mobile: {
      FCP: {weight: 0.10, median: 3000, p10: 1800},
      SI: {weight: 0.10, median: 5800, p10: 3387},
      LCP: {weight: 0.25, median: 4000, p10: 2500},
      TBT: {weight: 0.30, median: 600,  p10: 200},
      CLS: {weight: 0.25, median: 0.25, p10: 0.1},
    },
    desktop: {
      FCP: {weight: 0.10, median: 1600, p10: 934},
      SI: {weight: 0.10, median: 2300, p10: 1311},
      LCP: {weight: 0.25, median: 2400, p10: 1200},
      TBT: {weight: 0.30, median: 350, p10: 150},
      CLS: {weight: 0.25, median: 0.25, p10: 0.1},
    },
  },
  v8: {
    mobile: {
      FCP: {weight: 0.10, median: 3000, p10: 1800},
      SI: {weight: 0.10, median: 5800, p10: 3387},
      LCP: {weight: 0.25, median: 4000, p10: 2500},
      TTI: {weight: 0.10, median: 7300, p10: 3785},
      TBT: {weight: 0.30, median: 600,  p10: 200},
      CLS: {weight: 0.15, median: 0.25, p10: 0.1},
    },
    desktop: {
      FCP: {weight: 0.10, median: 1600, p10: 934},
      SI: {weight: 0.10, median: 2300, p10: 1311},
      LCP: {weight: 0.25, median: 2400, p10: 1200},
      TTI: {weight: 0.10, median: 4500, p10: 2468},
      TBT: {weight: 0.30, median: 350, p10: 150},
      CLS: {weight: 0.15, median: 0.25, p10: 0.1},
    },
  },
  v6: {
    mobile: {
      FCP: {weight: 0.15, median: 4000, p10: 2336},
      SI: {weight: 0.15, median: 5800, p10: 3387},
      LCP: {weight: 0.25, median: 4000, p10: 2500},
      TTI: {weight: 0.15, median: 7300, p10: 3785},
      TBT: {weight: 0.25, median: 600, p10: 287},
      CLS: {weight: 0.05, median: 0.25, p10: 0.1},
    },
    desktop: {
      FCP: {weight: 0.15, median: 1600, p10: 934},
      SI: {weight: 0.15, median: 2300, p10: 1311},
      LCP: {weight: 0.25, median: 2400, p10: 1200},
      TTI: {weight: 0.15, median: 4500, p10: 2468},
      TBT: {weight: 0.25, median: 350, p10: 150},
      CLS: {weight: 0.05, median: 0.25, p10: 0.1},
    },
  },
  v5: {
    FCP: {weight: 0.2, median: 4000, podr: 2000},
    SI: {weight: 0.26666, median: 5800, podr: 2900},
    FMP: {weight: 0.066666, median: 4000, podr: 2000},
    TTI: {weight: 0.33333, median: 7300, podr: 2900},
    FCI: {weight: 0.133333, median: 6500, podr: 2900},
  },
};

/**
 * @param {Record<string, {weight: number, median: number, podr: number}>} curves
 */
function makeScoringGuide(curves) {
  const scoringGuide = {};
  for (const [key, curve] of Object.entries(curves)) {
    scoringGuide[key] = {...metrics[key], ...curve};
  }
  return scoringGuide;
}

const scoringGuides = {
  // v9 => v8 and v7 => v6 is handled in normalizeVersions()
  v10: {
    mobile: makeScoringGuide(curves.v10.mobile),
    desktop: makeScoringGuide(curves.v10.desktop),
  },
  v8: {
    mobile: makeScoringGuide(curves.v8.mobile),
    desktop: makeScoringGuide(curves.v8.desktop),
  },
  v6: {
    mobile: makeScoringGuide(curves.v6.mobile),
    desktop: makeScoringGuide(curves.v6.desktop),
  },
  v5: {
    mobile: makeScoringGuide(curves.v5),
    desktop: makeScoringGuide(curves.v5),
  },
};

function updateGauge(wrapper, category) {
  _setPerfGaugeExplodey(wrapper, category);
}

function _determineTrig(sizeSVG, percent, strokeWidth) {
  strokeWidth = strokeWidth || sizeSVG / 32;

  const radiusInner = sizeSVG / strokeWidth;
  const strokeGap = 0.5 * strokeWidth;
  const radiusOuter = radiusInner + strokeGap + strokeWidth;

  const circumferenceInner = 2 * Math.PI * radiusInner;
  // arc length we need to subtract
  // for very small strokeWidth:radius ratios this is ≈ strokeWidth
  // angle = acute angle of isosceles △ with 2 edges equal to radius & 3rd equal to strokeWidth
  // angle formula given by law of cosines
  const endDiffInner = Math.acos(1 - 0.5 * Math.pow((0.5 * strokeWidth) / radiusInner, 2)) * radiusInner;

  const circumferenceOuter = 2 * Math.PI * radiusOuter;
  const endDiffOuter = Math.acos(1 - 0.5 * Math.pow((0.5 * strokeWidth) / radiusOuter, 2)) * radiusOuter;

  return {
    radiusInner,
    radiusOuter,
    circumferenceInner,
    circumferenceOuter,
    getArcLength: _ => Math.max(0, +(percent * circumferenceInner - 2 * endDiffInner).toFixed(4)),
    // isButt case is for metricArcHoverTarget
    getMetricArcLength: (weightingPct, isButt) => {
      // TODO: this math isn't perfect butt it's very close.
      const linecapFactor = isButt ? 0 : 2 * endDiffOuter;
      return Math.max(0, +(weightingPct * circumferenceOuter - strokeGap - linecapFactor).toFixed(4));
    },
    endDiffInner,
    endDiffOuter,
    strokeWidth,
    strokeGap,
  };
}

/**
 * @param {HTMLAnchorElement} wrapper
 * @param {LH.ReportResult.Category} category
 */
function _setPerfGaugeExplodey(wrapper, category) {
  const sizeSVG = 128;
  const offsetSVG = -0.5 * sizeSVG;

  const percent = Number(category.score);
  const {
    radiusInner,
    radiusOuter,
    circumferenceInner,
    circumferenceOuter,
    getArcLength,
    getMetricArcLength,
    endDiffInner,
    endDiffOuter,
    strokeWidth,
    strokeGap,
  } = _determineTrig(sizeSVG, percent);

  const SVG = wrapper.querySelector('.lh-gauge');
  const NS_URI = 'http://www.w3.org/2000/svg';

  SVG.setAttribute('viewBox', [offsetSVG, offsetSVG, sizeSVG, sizeSVG].join(' '));
  SVG.style.setProperty('--stroke-width', `${strokeWidth}px`);
  SVG.style.setProperty('--circle-meas', 2 * Math.PI.toFixed(4));

  const groupOuter = wrapper.querySelector('.lh-gauge__outer');
  const groupInner = wrapper.querySelector('.lh-gauge__inner');
  const cover = groupOuter.querySelector('.cover');
  const gaugeArc = groupInner.querySelector('.lh-gauge__arc');
  const gaugePerc = groupInner.querySelector('.lh-gauge__percentage');

  groupOuter.style.setProperty('--scale-initial', radiusInner / radiusOuter);
  groupOuter.style.setProperty('--radius', `${radiusOuter}px`);
  cover.style.setProperty('--radius', `${0.5 * (radiusInner + radiusOuter)}px`);
  cover.setAttribute('stroke-width', strokeGap);
  SVG.style.setProperty('--radius', `${radiusInner}px`);

  gaugeArc.setAttribute('stroke-dasharray', `${getArcLength()} ${(circumferenceInner - getArcLength()).toFixed(4)}`);
  gaugeArc.setAttribute('stroke-dashoffset', 0.25 * circumferenceInner - endDiffInner);

  gaugePerc.textContent = Math.round(percent * 100);

  const radiusTextOuter = radiusOuter + strokeWidth;
  const radiusTextInner = radiusOuter - strokeWidth;

  const metrics = category.auditRefs.filter(r => r.group === 'metrics' && r.weight);
  const totalWeight = metrics.reduce((sum, each) => (sum += each.weight), 0);
  let offsetAdder = 0.25 * circumferenceOuter - endDiffOuter - 0.5 * strokeGap;
  let angleAdder = -0.5 * Math.PI;

  // Extra hack on top of the HACK for element reuse below. Delete any metric elems that aren't needed anymore (happens when the same gauge goes from v5 to v6)
  groupOuter.querySelectorAll('.metric').forEach(metricElem => {
    const classNamesToRetain = metrics.map(metric => `metric--${metric.id}`);
    const match = classNamesToRetain.find(selector => metricElem.classList.contains(selector));
    if (!match) { metricElem.remove(); }
  });

  metrics.forEach((metric, i) => {
    // TODO(porting to real LHR..): in scorecalc we dont use the real audit ID just the acronym.
    const alias = metric.id;

    // Hack
    const needsDomPopulation = !groupOuter.querySelector(`.metric--${alias}`);

    // HACK:This isn't ideal but it was quick. Create element during initialization or reuse existing during updates
    const metricGroup = groupOuter.querySelector(`.metric--${alias}`) || document.createElementNS(NS_URI, 'g');
    const metricArcMax = groupOuter.querySelector(`.metric--${alias} .lh-gauge--faded`) || document.createElementNS(NS_URI, 'circle');
    const metricArc = groupOuter.querySelector(`.metric--${alias} .lh-gauge--miniarc`) || document.createElementNS(NS_URI, 'circle');
    const metricArcHoverTarget = groupOuter.querySelector(`.metric--${alias} .lh-gauge-hover`) || document.createElementNS(NS_URI, 'circle');
    const metricLabel = groupOuter.querySelector(`.metric--${alias} .metric__label`) || document.createElementNS(NS_URI, 'text');
    const metricValue = groupOuter.querySelector(`.metric--${alias} .metric__value`) || document.createElementNS(NS_URI, 'text');

    metricGroup.classList.add('metric', `metric--${alias}`);
    metricArcMax.classList.add('lh-gauge__arc', 'lh-gauge__arc--metric', 'lh-gauge--faded');
    metricArc.classList.add('lh-gauge__arc', 'lh-gauge__arc--metric', 'lh-gauge--miniarc');
    metricArcHoverTarget.classList.add('lh-gauge__arc', 'lh-gauge__arc--metric', 'lh-gauge--faded', 'lh-gauge-hover');

    const weightingPct = metric.weight / totalWeight;
    const metricLengthMax = getMetricArcLength(weightingPct);
    const metricPercent = metric.result.score * weightingPct;
    const metricLength = getMetricArcLength(metricPercent);
    const metricOffset = weightingPct * circumferenceOuter;
    const metricHoverLength = getMetricArcLength(weightingPct, true);

    metricGroup.style.setProperty('--metric-color', `var(--palette-${i})`);
    metricGroup.style.setProperty('--metric-offset', `${offsetAdder}`);
    metricGroup.style.setProperty('--i', i);

    metricArcMax.setAttribute('stroke-dasharray', `${metricLengthMax} ${circumferenceOuter - metricLengthMax}`);
    metricArc.style.setProperty('--metric-array', `${metricLength} ${circumferenceOuter - metricLength}`);
    metricArcHoverTarget.setAttribute('stroke-dasharray', `${metricHoverLength} ${circumferenceOuter - metricHoverLength - endDiffOuter}`);

    metricLabel.classList.add('metric__label');
    metricValue.classList.add('metric__value');
    metricLabel.textContent = alias;
    metricValue.textContent = `+${Math.round(metricPercent * 100)}`;

    const midAngle = angleAdder + weightingPct * Math.PI;
    const cos = Math.cos(midAngle);
    const sin = Math.sin(midAngle);

    // only set non-default alignments
    switch (true) {
      case cos > 0:
        metricValue.setAttribute('text-anchor', 'end');
        break;
      case cos < 0:
        metricLabel.setAttribute('text-anchor', 'end');
        break;
      case cos === 0:
        metricLabel.setAttribute('text-anchor', 'middle');
        metricValue.setAttribute('text-anchor', 'middle');
        break;
    }

    switch (true) {
      case sin > 0:
        metricLabel.setAttribute('dominant-baseline', 'hanging');
        break;
      case sin < 0:
        metricValue.setAttribute('dominant-baseline', 'hanging');
        break;
      case sin === 0:
        metricLabel.setAttribute('dominant-baseline', 'middle');
        metricValue.setAttribute('dominant-baseline', 'middle');
        break;
    }

    metricLabel.setAttribute('x', (radiusTextOuter * cos).toFixed(2));
    metricLabel.setAttribute('y', (radiusTextOuter * sin).toFixed(2));
    metricValue.setAttribute('x', (radiusTextInner * cos).toFixed(2));
    metricValue.setAttribute('y', (radiusTextInner * sin).toFixed(2));

    if (needsDomPopulation) {
      metricGroup.appendChild(metricArcMax);
      metricGroup.appendChild(metricArc);
      metricGroup.appendChild(metricArcHoverTarget);
      metricGroup.appendChild(metricLabel);
      metricGroup.appendChild(metricValue);
      groupOuter.appendChild(metricGroup);
    }

    offsetAdder -= metricOffset;
    angleAdder += weightingPct * 2 * Math.PI;
  });

  // Hack. Not ideal.
  if (SVG.dataset.listenersSetup) { return; }
  SVG.dataset.listenersSetup = true;

  // peekGauge(SVG);

  /*
    wrapper.state-expanded: gauge is exploded
    wrapper.state-highlight: gauge is exploded and one of the metrics is being highlighted
    metric.metric-highlight: highlight this particular metric
  */
  SVG.addEventListener('mouseover', e => {
    // if hovering on the SVG and its expanded, get rid of everything
    if (e.target === SVG && wrapper.classList.contains('state--expanded')) {
      // paul: not sure why we want to remove this.. seems like we want to keep it expanded...
      SVG.classList.remove('state--expanded');

      if (SVG.classList.contains('state--highlight')) {
        SVG.classList.remove('state--highlight');
        SVG.querySelector('.metric--highlight').classList.remove('metric--highlight');
      }
      return;
    }

    const parent = e.target.parentNode;

    // if hovering on a metric, highlight that one.
    // TODO: The hover target is a little small. ideally it's thicker.
    if (parent && parent.classList && parent.classList.contains('metric')) {
      // match the bg color of the gauge during a metric highlight
      wrapper.style.setProperty('--color-highlight', `var(--palette-${parent.style.getPropertyValue('--i')})`);

      if (!SVG.classList.contains('state--highlight')) {
        SVG.classList.add('state--highlight');
        parent.classList.add('metric--highlight');
      } else {
        const highlighted = SVG.querySelector('.metric--highlight');

        if (highlighted && parent !== highlighted) {
          highlighted.classList.remove('metric--highlight');
          parent.classList.add('metric--highlight');
        }
      }
    }
  });

  // clear on mouselave even if mousemove didn't catch it.
  SVG.addEventListener('mouseleave', e => {
    SVG.classList.remove('state--highlight');
    const mh = SVG.querySelector('.metric--highlight');
    mh && mh.classList.remove('metric--highlight');
  });
}

const params = new URLSearchParams(location.hash.substr(1));

function determineMinMax(metricScoring) {
  const valueAtScore100 = VALUE_AT_QUANTILE(metricScoring, 0.995);
  const valueAtScore5 = VALUE_AT_QUANTILE(metricScoring, 0.05);

  let min = Math.floor(valueAtScore100 / 1000) * 1000;
  let max = Math.ceil(valueAtScore5 / 1000) * 1000;
  let step = 10;

  // Special handling for CLS
  if (metricScoring.units === 'unitless') {
    min = 0;
    max = Math.ceil(valueAtScore5 * 100) / 100;
    step = 0.01;
  }

  return {
    min,
    max,
    step,
  };
}

/**
 * @param {string} version
 */
function getMajorVersion(version) {
  return version.split('.')[0];
}

function clampMetricValuesForDevice(metricValues, versions, device) {
  const nextMetricValues = {...metricValues};
  const versionKeys = versions.map(version => `v${version}`);

  for (const id of Object.keys(nextMetricValues)) {
    const bounds = versionKeys
      .map(versionKey => {
        const scoringGuide = scoringGuides[versionKey] && scoringGuides[versionKey][device];
        return scoringGuide && scoringGuide[id];
      })
      .filter(Boolean)
      .map(determineMinMax);

    if (!bounds.length) continue;

    const min = Math.max(...bounds.map(bound => bound.min));
    const max = Math.min(...bounds.map(bound => bound.max));
    if (min <= max) {
      nextMetricValues[id] = Math.max(Math.min(nextMetricValues[id], max), min);
    }
  }

  return nextMetricValues;
}

class Metric extends m {
  onValueChange(e) {
    const {id} = this.props;

    this.props.app.setState({
      metricValues: {
        ...this.props.app.state.metricValues,
        [id]: e.target.valueAsNumber,
      },
    });
  }

  onScoreChange(e) {
    const {id, metricScoring} = this.props;

    const score = e.target.valueAsNumber;
    let computedValue = VALUE_AT_QUANTILE(metricScoring, score / 100);

    // Clamp because we can end up with Infinity
    const { min, max } = determineMinMax(metricScoring);
    computedValue = Math.max(Math.min(computedValue, max), min);

    if (metricScoring.units !== 'unitless') {
      computedValue = Math.round(computedValue);
    }

    this.props.app.setState({
      metricValues: {
        ...this.props.app.state.metricValues,
        [id]: computedValue,
      },
    });
  }

  render({ id, value, score, weightMax, metricScoring }) {
    const { min, max, step } = determineMinMax(metricScoring);
    const weight = metricScoring.weight;
    const valueFormatted = metricScoring.units === 'unitless' ?
      value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) :
      // TODO: Use https://github.com/tc39/proposal-unified-intl-numberformat#i-units when Safari/FF support it
      `${numberFormatter.format(value)}${NBSP}ms`;
    const weightFormatted = (weight * 100).toLocaleString(undefined, {maximumFractionDigits: 1});

    return h( 'tr', { class: `lh-metric--${calculateRating(score / 100)}` },
      h( 'td', null,
        h( 'span', { class: "lh-metric__score-icon" })
      ),
      h( 'td', null, `${id} (${metricScoring.name})` ),
      h( 'td', null,
        h( 'input', { type: "range", min: min, value: value, max: max, step: step, class: `${id} metric-value`, onInput: (e) => this.onValueChange(e) }),
        h( 'output', { class: "${id} value-output" }, valueFormatted)
      ),
      h( 'td', null ),

      h( 'td', null,
        h( 'input', { type: "range", class: `${id} metric-score`, style: `width: ${weight / weightMax * 100}%`, value: score, onInput: (e) => this.onScoreChange(e) }),
        h( 'output', { class: `${id} score-output` }, score)
      ),

      h( 'td', null,
        h( 'span', { class: `${id} weight-text` }, weightFormatted, "%")
      )
    )
  }
}

class Gauge extends m {
  constructor(props) {
    super(props);
    this.ref = y();
  }

  refreshGauge() {
    updateGauge(this.ref.current, {
      title: 'Performance',
      auditRefs: this.props.auditRefs,
      id: 'performance',
      score: this.props.score,
    });
  }

  componentDidMount() {
    this.refreshGauge();
  }

  componentDidUpdate() {
    this.refreshGauge();
  }

  render({ score }) {
    return (
      h( 'div', { ref: this.ref, class: `lh-gauge__wrapper lh-gauge__wrapper--${calculateRating(score)}` },
        h( 'div', { class: 'lh-gauge__svg-wrapper' },
          h( 'svg', { class: 'lh-gauge state--expanded' },
            h( 'g', { class: 'lh-gauge__inner' },
              h( 'circle', { class: 'lh-gauge__bg' }),
              h( 'circle', { class: 'lh-gauge__base lh-gauge--faded' }),
              h( 'circle', { class: 'lh-gauge__arc' }),
              h( 'text', { class: 'lh-gauge__percentage' })
            ),
            h( 'g', { class: 'lh-gauge__outer' },
              h( 'circle', { class: 'cover' })
            )
          )
        )
      )
    );
  }
}

class ScoringGuide extends m {
  render({ app, name, values, scoring }) {
    // Make sure weights total to 1
    const weights = Object.values(scoring).map(metricScoring => metricScoring.weight);
    const weightSum = weights.reduce((agg, val) => (agg += val));
    const weightMax = Math.max(...Object.values(weights));
    console.assert(weightSum > 0.999 && weightSum < 1.0001); // lol rounding is hard.

    const metricsData = Object.keys(scoring).map(id => {
      const metricScoring = scoring[id];
      return {
        id,
        metricScoring,
        value: values[id],
        score: Math.round(QUANTILE_AT_VALUE(metricScoring, values[id]) * 100),
      };
    });

    const auditRefs = metricsData.map(metric => {
      return {
        id: metric.id,
        weight: metric.metricScoring.weight,
        group: 'metrics',
        result: {
          score: metric.score / 100,
        },
      };
    });

    const score = arithmeticMean(auditRefs);

    let title = h( 'h2', null, name );
    if (name === 'v10') {
      title = h( 'h2', null, "latest", h( 'br', null ), h( 'i', null, h( 'a', { href: "https://github.com/GoogleChrome/lighthouse/releases/tag/v10.0.0" }, "v10") ) );
    } else if (name === 'v8') {
      title = h( 'h2', null, h( 'i', null, h( 'a', { href: "https://github.com/GoogleChrome/lighthouse/releases/tag/v8.0.0" }, "v8, v9") ) );
    } else if (name === 'v6') {
      title = h( 'h2', null, h( 'i', null, h( 'a', { href: "https://github.com/GoogleChrome/lighthouse/releases/tag/v6.0.0" }, "v6, v7") ) );
    }

    return h( 'form', { class: "wrapper" },
      title,

      h( 'table', null,
        h( 'thead', null,
          h( 'tr', null,
            h( 'th', { class: "th--metric", colspan: "2" }),
            h( 'th', { class: "th--value" }, "Value"),
            h( 'th', { class: "th--spacer" }),
            h( 'th', { class: "th--score" }, "Metric Score"),
            h( 'th', { class: "th--weight" }, "Weighting")
          )
        ),
        h( 'tbody', null,
          metricsData.map(metric => {
            return h( Metric, Object.assign({}, { app: app, weightMax: weightMax, metricScoring: metric.metricScoring }, metric))
          })
        )
      ),

      h( 'div', { class: "perfscore" },
        h( Gauge, { score: score, auditRefs: auditRefs })
      )
    )
  }
}

const debounce = (callback, time = 250, interval) =>
  ((...args) => {
    clearTimeout(interval);
    interval = setTimeout(() => callback(...args), time);
  });

class App extends m {
  constructor(props) {
    super(props);
    this.state = getInitialState();
    this.onDeviceChange = this.onDeviceChange.bind(this);
    this.onVersionsChange = this.onVersionsChange.bind(this);
    // debounce to avoid flooding with new URLs
    this.debouncedUpdatePermalink = debounce(this.updatePermalink);
  }

  updatePermalink(state) {
    const {versions, device, metricValues} = state;
    const url = new URL(location.href);
    const auditIdValuePairs = Object.entries(metricValues).map(([id, value]) => {
      return [id, value];
    });
    const params = new URLSearchParams(auditIdValuePairs);
    params.set('device', device);
    for (const version of versions) params.append('version', version);
    url.hash = params.toString();
    history.replaceState(state, '', url.toString());
  }

  componentDidUpdate() {
    this.debouncedUpdatePermalink(this.state);
  }

  onDeviceChange(e) {
    const device = e.target.value;
    const versions = this.normalizeVersions(this.state.versions);
    const metricValues = clampMetricValuesForDevice(this.state.metricValues, versions, device);
    this.setState({device, metricValues});
  }

  onVersionsChange(e) {
    this.setState({versions: e.target.value.split(',')});
  }

  normalizeVersions(versions) {
    return versions.map(version => {
      version = parseInt(version, 10);
      if (version < 5) {
        throw new Error(`Unsupported Lighthouse version (${version})`);
      }
      
      switch (version) {
        default:
        case 12:
        case 11:
        case 10:
          return 10;
        case 9:
        case 8:
          return 8;
        case 7:
        case 6:
          return 6;
      }
    });
  }

  render() {
    const {versions, device, metricValues} = this.state;

    const normalizedVersions = this.normalizeVersions(versions);

    const scoringGuideEls = normalizedVersions.map(version => {
      const key = `v${version}`;
      console.assert(scoringGuides[key], `scoringGuide for ${key} doesnt exist`);
      return h( ScoringGuide, { app: this, name: key, values: metricValues, scoring: scoringGuides[key][device] });
    });
    return h( 'div', { class: "app" },
      h( 'div', { class: "controls wrapper" },
        h( 'label', null, "Device type: ", h( 'select', { name: "device", value: device, onChange: this.onDeviceChange },
            h( 'option', { value: "mobile" }, "Mobile"),
            h( 'option', { value: "desktop" }, "Desktop")
          )
        ),
        h( 'label', null, "Versions: ", h( 'select', { name: "versions", value: normalizedVersions.join(','), onChange: this.onVersionsChange },
            h( 'option', { value: "10,8,6,5" }, "show all"),
            h( 'option', { value: "10" }, "v10, v11, v12"),
            h( 'option', { value: "8" }, "v8, v9"),
            h( 'option', { value: "6" }, "v6, v7"),
            h( 'option', { value: "5" }, "v5")
          )
        )
      ),
      scoringGuideEls
    )
  }
}

function getInitialState() {
  const availableScoringGuides = Object.keys(scoringGuides).map(k => parseInt(k.replace('v',''), 10)).sort((a, b) => b - a);

  const versions = params.has('version') ?
    params.getAll('version').map(getMajorVersion) :
    [`${availableScoringGuides.at(0) || 8}`]; // version (or versions) to show by default

  // Default to mobile if it's not matching our known emulatedFormFactors. https://github.com/GoogleChrome/lighthouse/blob/master/types/externs.d.ts#:~:text=emulatedFormFactor
  let device = params.get('device');
  if (device && device !== 'mobile' && device !== 'desktop') {
    console.warn(`Invalid emulatedFormFactors value: ${device}. Fallback to mobile scoring.`);
    device = 'mobile';
  } else if (!device) {
    // Device not expressed in the params
    device = 'mobile';
  }

  const metricValues = {};
  // If no metric values come in w/ params, initalize with mobile medians (score of 50)
  const metricScorings = {...scoringGuides.v5.mobile, ...scoringGuides.v8.mobile}; // v5 is neccessary for FCI
  for (const id in metricScorings) {
    metricValues[id] = metricScorings[id].median;
  }

  // Populate metricValues from query string.
  for (const [id, metric] of Object.entries(metrics)) {
    const value = params.get(id) || params.get(metric.auditId);
    if (!value) { continue; }
    metricValues[id] = Number(value);
  }

  return {
    versions,
    device,
    metricValues,
  };}

function main() {
  H(h( App, null ), $('#container'));
}

// just one call to main because i'm basic like that
main();
//# sourceMappingURL=calc.js.map
