# Sample Github action

This action prints "Hello World" or "Hello" + the name of a person to greet to the log.

## Inputs

### `GITHUB_ACTION`

**Required** The name of the person to greet. Default `"Worafsld"`.

## Outputs

### `time`

The time we greeted you.

## Example usage

uses: actions/sample-github-action@v1.1
with:
who-to-greet: 'Cat'
