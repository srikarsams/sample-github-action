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
    core.setFailed("No PR body available!");
  }
  console.log(`2. PR Body: ${pr_body}`);
  const regex = /\[x\] If you want to rebase\/retry this PR, check this box/;
  const regexTest = new RegExp(regex);
  const isRebaseAllowed = regexTest.test(pr_body);

  if (!isRebaseAllowed) {
    console.log("3. Rebase is not allowed since it is unchecked");
  } else {
    console.log("3. Rebase is allowed, proceeding with the merge");

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
    const octokit = github.getOctokit(inputs.githubToken);
    octokit.pulls.update(params);
    console.log("4. Updated the branch with unchecked body");
  }
}

run();
