/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {{type: string, scope?: string, header: string, hash?: string, message?: string, PR?: string}} Commit */
/**
 * @typedef TemplateContext
 * @property {string=} version
 * @property {string=} date
 * @property {boolean=} linkCompare
 * @property {boolean=} linkReferences
 * @property {string=} host
 * @property {string=} owner
 * @property {string=} repository
 * @property {string=} previousTag
 * @property {string=} currentTag
 * @property {string=} commit
 * @property {Array<{title?: string, commits: Commit[]}>=} commitGroups
 */

/**
 * @param {TemplateContext} context
 */
function getRepoUrl(context) {
  const host = context.host ? `${context.host}/` : '';
  const owner = context.owner ? `${context.owner}/` : '';
  return `${host}${owner}${context.repository || ''}`;
}

/**
 * @param {TemplateContext} context
 */
function headerPartial(context) {
  const repoUrl = getRepoUrl(context);
  const compareLine = context.linkCompare
    ? `[Full Changelog](${repoUrl}/compare/${context.previousTag}...${context.currentTag})`
    : '';
  return [
    `<a name="${context.version}"></a>`,
    `# ${context.version} (${context.date})`,
    compareLine,
    '',
    '',
    '~~ TODO: https://chromiumdash.appspot.com/schedule ~~',
    'We expect this release to ship in the DevTools of [Chrome XXX](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.',
  ].join('\n');
}

/**
 * @param {TemplateContext} context
 * @param {Commit} commit
 */
function commitPartial(context, commit) {
  const scopePrefix = commit.scope ? `${commit.scope}: ` : '';
  const subject = commit.message || commit.header;
  let ref = commit.hash || '';
  if (context.linkReferences) {
    const repoUrl = getRepoUrl(context);
    if (commit.PR) {
      ref = ` ([#${commit.PR}](${repoUrl}/pull/${commit.PR}))`;
    } else {
      ref = ` ([${commit.hash}](${repoUrl}/${context.commit}/${commit.hash}))`;
    }
  }
  return `* ${scopePrefix}${subject}${ref}`;
}

/**
 * @param {TemplateContext} context
 */
function template(context) {
  const groups = (context.commitGroups || []).map(group => {
    const heading = group.title ? `## ${group.title}\n\n` : '';
    const commits = group.commits.map(commit => commitPartial(context, commit)).join('\n');
    return `${heading}${commits}`;
  }).join('\n\n');
  return [
    headerPartial(context),
    '',
    '## Notable Changes',
    '~~ TODO: Move notable changes here ~~',
    '',
    groups,
  ].join('\n');
}

const pullRequestRegex = /\(#(\d+)\)$/;
const parserOpts = {
  headerPattern: /^(\w*)(?:\((.*)\))?: (.*)$/,
  headerCorrespondence: [
    'type',
    'scope',
    'message',
  ],
};

process.stderr.write(`
> Be sure to have the latest git tags locally:
    git fetch --tags

`);

const titlePrecedence = [
  'New Audits',
  'Core',
  'CLI',
  'Report',
  'Deps',
  'Clients',
  'I18n',
  'Docs',
  'Tests',
  'Misc',
];

const writerOpts = {
  template,
  headerPartial,
  commitPartial,
  /** @param {Commit} rawCommit */
  transform: rawCommit => {
    const commit = {...rawCommit};
    if (typeof commit.hash === 'string') {
      commit.hash = commit.hash.substring(0, 7);
    }

    if (commit.type === 'test') {
      commit.type = 'tests';
    } else if (commit.type === 'cli') {
      commit.type = 'CLI';
    } else if (commit.type === 'new_audit') {
      commit.type = 'New Audits';
    }

    if (commit.type) {
      commit.type = commit.type.replace(/_/g, ' ');
      commit.type = commit.type.substring(0, 1).toUpperCase() + commit.type.substring(1);
    } else {
      commit.type = 'Misc';
    }

    let pullRequestMatch = commit.header.match(pullRequestRegex);
    // if header does not provide a PR we try the message
    if (!pullRequestMatch && commit.message) {
      pullRequestMatch = commit.message.match(pullRequestRegex);
    }

    if (pullRequestMatch) {
      commit.header = commit.header.replace(pullRequestMatch[0], '').trim();
      if (commit.message) {
        commit.message = commit.message.replace(pullRequestMatch[0], '').trim();
      }

      commit.PR = pullRequestMatch[1];
    }

    return commit;
  },
  groupBy: 'type',
  /** @param {{title: string}} a @param {{title: string}} b */
  commitGroupsSort: (a, b) => {
    const aIndex = titlePrecedence.indexOf(a.title);
    const bIndex = titlePrecedence.indexOf(b.title);

    // If neither value has a title with a predefined order, use an alphabetical comparison.
    if (aIndex === -1 && bIndex === -1) {
      return a.title.localeCompare(b.title);
    }

    // If just one value has a title with a predefined order, it is greater.
    if (aIndex === -1 && bIndex >= 0) {
      return 1;
    }
    if (bIndex === -1 && aIndex >= 0) {
      return -1;
    }

    // Both values have a title with a predefined order, so do a simple comparison.
    return aIndex - bIndex;
  },
  commitsSort: ['type', 'scope'],
};

export default {
  writer: writerOpts,
  parser: parserOpts,
};

export {
  writerOpts,
  parserOpts,
};
