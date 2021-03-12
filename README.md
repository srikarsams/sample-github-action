# Sample Github action

This action prints "Hello World" or "Hello" + the name of a person to greet to the log.

## Inputs

### `GITHUB_ACTION`

**Required** Github token

### `TRIAL_RUN`

flag for trial run. No merge will happen, just logs the result.

### `COMMIT_MESSAGE`

Message to be used while merging!

## Example usage

uses: srikarsams/sample-github-action@v1.3.26
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    COMMIT_MESSAGE: "Rebase done successfully!"
