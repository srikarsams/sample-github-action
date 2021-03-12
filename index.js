const core = require("@actions/core");
const github = require("@actions/github");

class RebaseAction {
  constructor() {
    this.checkedRegex = /\[x\] If you want to rebase\/retry this PR, check this box/;
    this.uncheckedString = `[ ] If you want to rebase/retry this PR, check this box`;
    this.inputs = {
      githubToken: core.getInput("GITHUB_TOKEN", { required: true }),
      trialRun: Boolean(core.getInput("TRIAL_RUN")) || false,
      commitMessage: core.getInput("COMMIT_MESSAGE") || "Rebasing done!",
    };
    this.octokit = github.getOctokit(this.inputs.githubToken);
    this.pr_data = github.context.payload.pull_request;
    this.pr_body = this.pr_data.body;
    this.pr_number = this.pr_data.number;
    this.repo_data = github.context.repo;
  }

  /**
   * Resets the checkbox in the PR description
   */
  async resetCheckbox() {
    // replacing the checked rebase prompt with unchecked one
    const updatedBody = this.pr_body.replace(
      this.checkedRegex,
      this.uncheckedString
    );
    const params = {
      owner: this.repo_data.owner,
      repo: this.repo_data.repo,
      pull_number: this.pr_number,
      body: updatedBody,
    };
    await this.octokit.pulls.update(params);
    core.info("Unchecked the rebase flag in PR description");
  }

  /**
   * Checks whether PR can be merged
   */
  async doesPrNeedsUpdate() {
    if (this.pr_data.merged === true) {
      core.warning("Skipping pull request, already merged.");
      return false;
    }
    if (this.pr_data.state !== "open") {
      core.warning(
        `Skipping pull request, no longer open (current state: ${this.pr_data.state}).`
      );
      return false;
    }
    if (!this.pr_data.head.repo) {
      core.warning(`Skipping pull request, fork appears to have been deleted.`);
      return false;
    }

    const { data: comparison } = await this.octokit.repos.compareCommits({
      owner: this.pr_data.head.repo.owner.login,
      repo: this.pr_data.head.repo.name,
      base: this.pr_data.base.label,
      head: this.pr_data.head.label,
    });

    if (comparison.behind_by === 0) {
      core.info("Skipping pull request, up-to-date with base branch.");
      return false;
    }
    core.info(
      `Master is ahead of ${this.pr_data.head.ref} by ${comparison.behind_by} commits`
    );
    return true;
  }

  /**
   * Rebases the branch
   */
  async rebase() {
    const baseRef = this.pr_data.base.ref;
    const headRef = this.pr_data.head.ref;

    core.info(
      `Updating branch '${headRef}' on pull request #${this.pr_data.number} with changes from ref '${baseRef}'.`
    );

    // if trialRun is true, it just logs the merge details else proceeds with the merge
    if (this.inputs.trialRun) {
      core.warning(
        `Would have merged ref '${headRef}' into ref '${baseRef}' but TRAIL_RUN was enabled.`
      );
      return true;
    }

    const mergeOptions = {
      owner: this.pr_data.head.repo.owner.login,
      repo: this.pr_data.head.repo.name,
      base: headRef,
      head: baseRef,
      commit_message: this.inputs.commitMessage,
    };

    try {
      const mergeResponse = await this.octokit.repos.merge(mergeOptions);

      const { status } = mergeResponse;
      if (status === 200 || status === 201) {
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
          "Merge conflict error. Not proceeding with merge. Please resolve the conflicts manually"
        );
        await this.resetCheckbox();
        throw err;
      }
      core.error(`Caught error trying to update branch: ${err.message}`);
      await this.resetCheckbox();
      throw err;
    }
  }

  /**
   * Starts the validation and merge process
   */
  async run() {
    if (!this.pr_data) {
      core.setFailed("No PR data available!");
    }

    if (!this.pr_number) {
      core.setFailed("No PR number available!");
    }
    core.info(`PR Number is ${this.pr_number}`);

    if (!this.pr_body) {
      core.setFailed("No PR body available!");
    }

    const regexTest = new RegExp(this.checkedRegex);
    const isRebaseAllowed = regexTest.test(this.pr_body);

    if (!isRebaseAllowed) {
      core.info("Rebase is not allowed since it is unchecked");
    } else {
      core.info(
        "Flag is checked, rebase is allowed. Proceeding with the merge"
      );

      const prNeedsUpdate = await this.doesPrNeedsUpdate();

      if (prNeedsUpdate) {
        core.info("PR branch is behind master. Updating now....");
        await this.rebase();
      } else {
        core.warning(
          "PR branch is up-to-date with master. Not proceeding with merge"
        );
      }
      await this.resetCheckbox();
    }
  }
}

const rebaseInstance = new RebaseAction();
try {
  rebaseInstance.run();
} catch (err) {
  rebaseInstance.resetCheckbox();
  core.error(err.message);
}
