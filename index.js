const core = require("@actions/core");
const github = require("@actions/github");

function doesPrNeedsUpdate(octokit, pr_data) {
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

  const { data: comparison } = octokit.repos.compareCommits({
    owner: pr_data.head.repo.owner.login,
    repo: pr_data.head.repo.name,
    // This base->head, head->base logic is intentional, we want
    // to see what would happen if we merged the base into head not
    // vice-versa.
    base: pr_data.head.label,
    head: pr_data.base.label,
  });

  if (comparison.behind_by === 0) {
    core.info("Skipping pull request, up-to-date with base branch.");
    return false;
  }

  return true;
}

function run() {
  const inputs = {
    githubToken: core.getInput("GITHUB_TOKEN", { required: true }),
  };
  const pr_data = github.context.payload.pull_request;
  if (!pr_data) {
    core.setFailed("No PR data available!");
  }
  const pr_number = github.context.payload.pull_request.number;

  if (!pr_number) {
    core.setFailed("No PR number available!");
  }
  core.info(`PR Number is ${pr_number}`);

  const pr_body = github.context.payload.pull_request.body;

  if (!pr_body) {
    core.setFailed("No PR body available!");
  }
  core.info(`PR Body: ${pr_body}`);
  const regex = /\[x\] If you want to rebase\/retry this PR, check this box/;
  const regexTest = new RegExp(regex);
  const isRebaseAllowed = regexTest.test(pr_body);

  if (!isRebaseAllowed) {
    core.info("Rebase is not allowed since it is unchecked");
  } else {
    core.info("Rebase is allowed, proceeding with the merge");

    const octokit = github.getOctokit(inputs.githubToken);
    const prNeedsUpdateFlag = doesPrNeedsUpdate(octokit, pr_data);

    if (prNeedsUpdateFlag) {
      core.info("PR branch is behind master. Updating now....");
      core.info(
        "Rebase has been done successfully. Resetting the checkbox now..."
      );
      const updatedBody = pr_body.replace(
        regex,
        `- [ ] If you want to rebase/retry this PR, check this box`
      );
      const params = {
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: pr_number,
        body: updatedBody,
      };
      octokit.pulls.update(params);
      core.info("Updated the branch with unchecked body");
    } else {
      core.warning(
        "PR branch is up-to-date with master. Not proceeding with merge"
      );
    }
  }
}

try {
  run();
} catch (err) {
  core.setFailed(err.message);
}
