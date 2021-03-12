# Sample Github action

This action prints "Hello World" + the name of a person to greet to the log.

## Inputs

### `who-to-greet`

**Required** The name of the person to greet. Default `"World"`.

## Outputs

### `time`

The time we greeted you.

## Example usage

uses: actions/sample-github-action@v1.1
with:
who-to-greet: 'Cat'
