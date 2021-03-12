# Sample Github action

This action prints "Hello World" or "Hello" + the name of a person to greet to the log.

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
