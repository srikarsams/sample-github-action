const core = require("@actions/core");
const github = require("@actions/github");

const regex = /\[x\] If you want to rebase\/retry this PR, check this box/;

function resetCheckbox(octokit, pr_data) {
  const updatedBody = pr_data.body.replace(
    regex,
    `[ ] If you want to rebase/retry this PR, check this box`
  );
  const params = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: pr_data.number,
    body: updatedBody,
  };
  octokit.pulls.update(params);
  core.info("Unchecked the rebase flag in PR description");
}

async function doesPrNeedsUpdate(octokit, pr_data) {
  if (pr_data.merged === true) {
    core.warning("Skipping pull request, already merged.");
    return false;
  }
  if (pr_data.state !== "open") {
    core.warning(
      `Skipping pull request, no longer open (current state: ${pull.state}).`
    );
    return false;
  }
  if (!pr_data.head.repo) {
    core.warning(`Skipping pull request, fork appears to have been deleted.`);
    return false;
  }

  const { data: comparison } = await octokit.repos.compareCommits({
    owner: pr_data.head.repo.owner.login,
    repo: pr_data.head.repo.name,
    // This base->head, head->base logic is intentional, we want
    // to see what would happen if we merged the base into head not
    // vice-versa.
    base: pr_data.head.label,
    head: pr_data.base.label,
  });

  console.log(JSON.stringify(comparison), "comparison");
  if (comparison.behind_by === 0) {
    core.info("Skipping pull request, up-to-date with base branch.");
    return false;
  }

  return true;
}

async function rebase(octokit, pr_data, inputs) {
  const baseRef = pr_data.base.ref;
  const headRef = pr_data.head.ref;

  core.info(
    `Updating branch '${headRef}' on pull request #${pr_data.number} with changes from ref '${baseRef}'.`
  );

  if (inputs.trailRun) {
    ghCore.warning(
      `Would have merged ref '${headRef}' into ref '${baseRef}' but TRAIL_RUN was enabled.`
    );
    return true;
  }

  const mergeOptions = {
    owner: pr_data.head.repo.owner.login,
    repo: pr_data.head.repo.name,
    // We want to merge the base branch into this one.
    base: headRef,
    head: baseRef,
    commit_message: inputs.commitMessage || "Rebasing done!",
  };

  try {
    const mergeResponse = await octokit.repos.merge(mergeOptions);

    const { status } = mergeResponse;
    console.log(JSON.stringify(status), "status");
    if (status === 200) {
      core.info(
        `Branch update successful, new branch HEAD: ${mergeResponse.data.sha}.`
      );
    } else if (status === 204) {
      core.info("Branch update not required, branch is already up-to-date.");
    }

    return true;
  } catch (err) {
    if (err.message === "Merge conflict") {
      core.error(
        "Merge conflict error. Not proceeding with merge. Please resolve manually"
      );
      resetCheckbox(octokit, pr_data);
      throw err;
    }
    core.error(`Caught error trying to update branch: ${err.message}`);
    resetCheckbox(octokit, pr_data);
    throw err;
  }
}

async function run() {
  const inputs = {
    githubToken: core.getInput("GITHUB_TOKEN", { required: true }),
  };
  const pr_data = github.context.payload.pull_request;
  if (!pr_data) {
    core.setFailed("No PR data available!");
  }
  const pr_number = pr_data.number;

  if (!pr_number) {
    core.setFailed("No PR number available!");
  }
  core.info(`PR Number is ${pr_number}`);

  const pr_body = pr_data.body;

  if (!pr_body) {
    core.setFailed("No PR body available!");
  }

  const regexTest = new RegExp(regex);
  const isRebaseAllowed = regexTest.test(pr_body);

  if (!isRebaseAllowed) {
    core.info("Rebase is not allowed since it is unchecked");
  } else {
    core.info("Rebase is allowed, proceeding with the merge");

    const octokit = github.getOctokit(inputs.githubToken);
    const prNeedsUpdate = await doesPrNeedsUpdate(octokit, pr_data);

    if (prNeedsUpdate) {
      core.info("PR branch is behind master. Updating now....");
      rebase(octokit, pr_data, inputs);
      resetCheckbox(octokit, pr_data);
    } else {
      resetCheckbox(octokit, pr_data);
      core.warning(
        "PR branch is up-to-date with master. Not proceeding with merge"
      );
    }
  }
}

try {
  run();
} catch (err) {
  core.error(err.message);
}
