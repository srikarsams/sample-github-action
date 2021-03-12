const core = require("@actions/core");
const github = require("@actions/github");

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
  console.log(`1. PR Number is ${pr_number}\n`);

  const pr_body = github.context.payload.pull_request.body;

  if (!pr_body) {
    core.setFailed("No PR body available!\n");
  }
  console.log(`PR Body: ${pr_body}`);
  const regex_for_rebase_check = new RegExp(
    /\[x\] If you want to rebase\/retry this PR, check this box/
  );
  const isRebaseAllowed = regex_for_rebase_check.test(pr_body);

  if (!isRebaseAllowed) {
    console.log("2. Rebase is not allowed since it is unchecked\n");
  } else {
    console.log("2. Rebase is allowed, proceeding with the merge\n");
    const params = {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: pr_number,
      body: "- [ ] If you want to rebase/retry this PR, check this box\n",
    };
    console.log(`Github token ${inputs.githubToken}`);
    const octokit = github.getOctokit(inputs.githubToken);
    octokit.pulls.update(params);
    console.log("3. Updated the branch with unchecked body\n");
  }
}

run();
