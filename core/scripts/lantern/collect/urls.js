/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const urlsLegacy = [
  // Flagship sites.
  'https://www.espn.com/',
  'https://www.flipkart.com',

  // TTI tester sites.
  'https://weather.com/',
  'https://www.dawn.com/',
  'https://www.thestar.com.my/',
  'https://www.vevo.com/',

  // High LCP / FCP ratio.
  'https://www.instagram.com/',
  'https://www.reddit.com/',

  // Popular sites from the 2019 dataset.
  'http://m.iciba.com',
  'http://www.zol.com.cn/',
  'https://en-maktoob.yahoo.com/?p=xa',
  'https://en.softonic.com',
  'https://m.hexun.com/',
  'https://m.sogou.com/',
  'https://m.youdao.com/',
  'https://mail.ru/',
  'https://sfbay.craigslist.org/',
  'https://wap.sogou.com/',
  'https://www.amazon.co.jp/',
  'https://www.att.com/',
  'https://www.bing.com/',
  'https://www.blogger.com/about/',
  'https://www.cnet.com/',
  'https://www.deviantart.com/',
  'https://www.domaintools.com/',
  'https://www.ebay.com/',
  'https://www.foxnews.com/',
  'https://www.gmx.net/',
  'https://www.hatena.ne.jp/',
  'https://www.hulu.com/welcome',
  'https://www.ifeng.com/',
  'https://www.irs.gov/',
  'https://www.java.com/en/',
  'https://www.linkedin.com/',
  'https://www.mgid.com/ru',
  'https://www.mlb.com/',
  'https://www.mozilla.org/en-US/',
  'https://www.msn.com/',
  'https://www.netflix.com/',
  'https://www.nih.gov/',
  'https://www.ning.com/',
  'https://www.nokia.com/',
  'https://www.onet.pl/',
  'https://www.orange.fr/portail',
  'https://www.rakuten.co.jp/',
  'https://www.scribd.com/',
  'https://www.shopping.com/',
  'https://www.tumblr.com/',
  'https://www.verizon.com/',
  'https://www.wikipedia.org/',
  'https://www.hp.com/us-en/home.html',

  // Cool sites.
  'https://birdsarentreal.com/',
  'https://noclip.website/',
  // Banjo :)
  'https://noclip.website/#bk/01;ZNCA8Ac%7d%7b15_%28S%7bMfXPk;;zm%28[o$K3YC;u%5e~P3%7duru4~L~W9l%7d&a79MC%7d=m$v*_8!_6DhC=',
  'https://www.codewars.com/',
];

const urlsBugReports = [
  // Cross-origin & multi-hop redirects (#17323, DevTools CL 8544953).
  'https://stripe.com/docs',
  'https://chromedevtools.github.io/performance-stories/many-redirects/index.html',

  // Video / Media LCP (#17324).
  'https://print24.com/',

  // ES Modules, modulepreload & PreloadRenderBlockingStatus (#16539, crbug.com/457323832).
  'https://entire-darlings-348663.framer.app/page-with-instant-lcp',
  'https://andydavies.github.io/agent-tests/render-blocking/css-preload.html',

  // Sequential network requests, RTT estimation & high request contention (#15897, #16588).
  'https://playground-70310.web.app/lh/test.html',
  'https://world.hey.com/dhh/we-tried-that-didn-t-work-d9c42fe1',
  'https://1um.github.io/lcp-test/lcp-1?fetchCount=40',
  'https://chromedevtools.github.io/performance-stories/lots-of-network-requests/index.html',

  // Late prefetch resource hints, fetchpriority=high & lazy-loaded LCP (#11856, #16034).
  'https://www.cbd-vital.at/',
  'https://westonruter.github.io/comparing-lcp-images-with-lazy-loading-and-fetchpriority-high/',
  'https://westonruter.github.io/comparing-lcp-images-with-lazy-loading-and-fetchpriority-high/lcp-image-with-fetchpriority-high-preload-link.html',

  // TTFB, Document Latency & simulated LCP Breakdown subparts (#16861, #16321, #16814, #14908, #14300).
  'https://www.eskimoz.fr/',
  'https://tamethebots.com/',
  'https://snippingtoolshortcuts.com/',
  'https://www.crunchbase.com/',
  'https://www.theverge.com/',
  'https://chromedevtools.github.io/performance-stories/lcp-discovery-delay/index.html',
  'https://chromedevtools.github.io/performance-stories/lcp-large-image/index.html',
  'https://chromedevtools.github.io/performance-stories/lcp-web-font/index.html',

  // Network dependency tree attribution (#17223, #17240).
  'https://neoschronos.com/insights/europes-venture-capital-gap/',
  'https://ecosurveys.wales/',

  // Storefront & modern framework waterfalls (#17230, #15965, #15021, #16509, #14880, #14824, #14634, #16203, #16149, #15976, #13845, #10918).
  'https://resinrock.com/',
  'https://www.radpowerbikes.com/',
  'https://grod-ksiecia-2023.vercel.app/',
  'https://starter2025.netlify.app/',
  'https://jlrbpress.ca/',
  'https://wp-rocket.me/',
  'https://www.scolby.com/',
  'https://pwcreative.com/',
  'https://informator.ua/uk',
  'https://www.arenasports.net/',
  'https://hostingcanada.org/',
  'https://onepropertee.com/',
  'https://astro-news-1026410574114.us-central1.run.app/',
  'https://dupe-modules-lh-2.surge.sh/',

  // Negative overallSavingsMs for prioritize-lcp-image / LCP graph stress cases (#16261).
  'https://rudolfuvpramen.cz/',
  'https://www.stokefoiling.com/',
  'https://corp.myufull.co.jp/',
  'https://daya-wisesa.com/',
  'https://www.weirtondailytimes.com/',
  'https://clubedegolfe.praia-del-rey.com/',
  'https://www.sodastudio.nl/',
  'https://lamontecchia.it/',
  'https://henselite.com/',
  'https://www.aftpharm.com/',
  'https://sorze4.com/',
  'https://www.makemyfirm.ae/',
  'https://emclient.jp/',
  'https://computeronthebeach.com.br/',
  'https://lokacupunctureclinic.com/',
  'https://elimcalzas.com.ar/',
  'https://ramar.berlin/',
  'https://www.marintextil.se/',
  'https://www.myluxury.it/',
  'https://www.naturesfinest.pl/',

  // LCP interesting cases & 11ty sites (#10527, #10529).
  'https://2018.nejsconf.com/',
  'https://2019.nejsconf.com/',
  'https://peterthaleikis.com/',
  'https://www.11ty.dev/docs/sites/',
  'https://genehack.blog/',
  'https://benediktmeurer.de/',
  'https://blog.tomayac.com/',
  'https://alexcarpenter.me/',
  'https://brycewray.com/',
  'https://christianfei.com/',
  'https://mohitkarekar.com/',
];

// Stratified sample from CrUX mobile (`httparchive.urls.latest_crux_mobile`).
const urlsCrux = [
  'https://ancientolympicsmuseum.com/',
  'https://app.cloutly.com/',
  'https://avis2.avis-verifies.com/',
  'https://bads.es/',
  'https://billetterie-egouts.paris.fr/',
  'https://boor.de/',
  'https://bsd.sos.in.gov/',
  'https://carsmile.pl/',
  'https://catalogue.vassar.edu/',
  'https://codingcirculate.com/',
  'https://cornell.zoom.us/',
  'https://cubaheute.de/',
  'https://direct.money.pl/',
  'https://ecoloboys.wordpress.com/',
  'https://figbid.com/',
  'https://flask.palletsprojects.com/',
  'https://freekidsbooks.org/',
  'https://gateway.bacb.com/',
  'https://ibagy.com.br/',
  'https://jna.ifmt.edu.br/',
  'https://kcmusa.org/',
  'https://moodle.catedu.es/',
  'https://northcoastcourier.co.za/',
  'https://portal.arryved.com/',
  'https://posit.cloud/',
  'https://seecolombia.travel/',
  'https://sparxmaths.com/',
  'https://webcat.unh.edu/',
];

const urls2026 = Array.from(new Set([
  ...urlsLegacy,
  ...urlsBugReports,
  ...urlsCrux,
])).sort();

export default urls2026;
