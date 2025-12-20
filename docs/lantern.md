# Lantern

## Overview

Project Lantern is an ongoing effort to reduce the run time of Lighthouse and improve audit quality by modeling page activity and simulating browser execution. This document details the accuracy of these models and captures the expected natural variability.

## Deep Dive

[![Lantern Deep Dive](https://img.youtube.com/vi/0dkry1r49xw/0.jpg)](https://www.youtube.com/watch?v=0dkry1r49xw)

## Accuracy

All of the following accuracy stats are reported on a set of 300 URLs sampled from the Alexa top 1000, HTTPArchive dataset, and miscellaneous ad landing pages. Median was collected for *9 runs* in one environment and compared to the median of *9 runs* in a second environment.

Stats were collected using the [trace-evaluation](https://github.com/patrickhulce/lighthouse-trace-evaluations) scripts. Table cells contain [Spearman's rho](https://en.wikipedia.org/wiki/Spearman%27s_rank_correlation_coefficient) and [MAPE](https://en.wikipedia.org/wiki/Mean_absolute_percentage_error) for the respective metric.

### Lantern Accuracy Stats
| Comparison | FCP | FMP | TTI |
| -- | -- | -- | -- |
| Lantern predicting Default LH | .811 : 23.1% | .811 : 23.6% | .869 : 42.5% |
| Lantern predicting LH on WPT | .785 : 28.3% | .761 : 33.7% | .854 : 45.4% |

### Reference Stats
| Comparison | FCP | FMP | TTI |
| -- | -- | -- | -- |
| Unthrottled LH predicting Default LH | .738 : 27.1% | .694 : 33.8% | .743 : 62.0% |
| Unthrottled LH predicting WPT | .691 : 33.8% | .635 : 33.7% | .712 : 66.4% |
| Default LH predicting WPT | .855 : 22.3% | .813 : 27.0% | .889 : 32.3% |

## Conclusions

### Lantern Accuracy Conclusions
We conclude that Lantern is ~6-13% more inaccurate than DevTools throttling. When evaluating rank performance, Lantern achieves correlations within ~.04-.07 of DevTools throttling.

* For the single view use case, our original conclusion that Lantern's inaccuracy is roughly equal to the inaccuracy introduced by expected variance seems to hold. The standard deviation of single observations from DevTools throttling is ~9-13%, and given Lantern's much lower variance, single observations from Lantern are not significantly more inaccurate on average than single observations from DevTools throttling.
* For the repeat view use case, we can conclude that Lantern is systematically off by ~6-13% more than DevTools throttling.

### Metric Variability Conclusions
The reference stats demonstrate that there is high degree of variability with the user-centric metrics and strengthens the position that every load is just an observation of a point drawn from a distribution and to understand the entire experience, multiple draws must be taken, i.e. multiple runs are needed to have sufficiently small error bounds on the median load experience.

The current size of confidence intervals for DevTools throttled performance scores are as follows.

* 95% confidence interval for **1-run** of site at median: 50 **+/- 15** = 65-35
* 95% confidence interval for **3-runs** of site at median: 50 **+/- 11** = 61-39
* 95% confidence interval for **5-runs** of site at median: 50 **+/- 8** = 58-42

## Links

* [Lighthouse Variability and Accuracy Analysis](https://docs.google.com/document/d/1BqtL-nG53rxWOI5RO0pItSRPowZVnYJ_gBEQCJ5EeUE/edit?usp=sharing)
* [Lantern Deck](https://docs.google.com/presentation/d/1EsuNICCm6uhrR2PLNaI5hNkJ-q-8Mv592kwHmnf4c6U/edit?usp=sharing)
* [Lantern Design Doc](https://docs.google.com/a/chromium.org/document/d/1pHEjtQjeycMoFOtheLfFjqzggY8VvNaIRfjC7IgNLq0/edit?usp=sharing)
* [WPT Trace Data Set Half 1](https://drive.google.com/open?id=1Y_duiiJVljzIEaYWEmiTqKQFUBFWbKVZ) (access on request)
* [WPT Trace Data Set Half 2](https://drive.google.com/open?id=1EoHk8nQaBv9aoaVv81TvR7UfXTUu2fiu) (access on request)
* [Unthrottled Trace Data Set Half 1](https://drive.google.com/open?id=1axJf9R3FPpzxhR7FKOvXPLFLxxApfwD0) (access on request)
* [Unthrottled Trace Data Set Half 2](https://drive.google.com/open?id=1krcWq5DF0oB1hq90G29bEwIP7zDcJrYY) (access on request)
