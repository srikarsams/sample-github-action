# Sample Github action

This action rabases the branches only if the checkbox is checked in the PR description.

## Inputs

### `GITHUB_ACTION`

**Required** The name of the person to greet. Default `"Word"`.

### `TRIAL_RUN`

flag for trial run. No merge will happen, just logs the result.

### `COMMIT_MESSAGE`

Message to be used while merging!

## Example usage

uses: actions/sample-github-action@v1.1
with:
who-to-greet: 'Cat'
