# Contributing guidelines

All contributions are welcome

## General Prerequisites

1. Install Node.js `>=16` minimum, [latest LTS is recommended](https://nodejs.org/en/about/releases/)
1. Install [`pnpm`](https://pnpm.io/) (for installing npm dependencies, using pnpm workspaces)
1. Install [`ts-node`](https://github.com/TypeStrong/ts-node) (for running Node.js scripts written in TypeScript)

## General Setup

```shell
git clone https://github.com/questioncove/nbbcjs.git
cd nbbcjs
pnpm i
```

> 💡 For Windows users: use the latest version of [Git Bash](https://gitforwindows.org/).

## Building Packages when you make changes

Run `pnpm run build` to build the project, it will output to the folder `./build`, and a webpack version of the code will be in `./build/dist`

## Testing

We use the [Jest Test Framework](https://jestjs.io/) for our unit testing, it removes the need for a lot of extra bloat. To run the unit tests, make sure you have installed the dependencies with `pnpm i`, and then run `pnpm test`. We also recommend if you are using vscode to install the jest extension.

If while contributing you need to add tests to nbbcjs, you'll find the file with the tests at `./tests/nbbc.test.ts`, the tests are contained with a JSON in the format of an object of categories, each with an array of tests that contain `descr` for the name of the test, `bbcode` for the input string to be passed to bbcode, and `html` as the expected output. There are also other features that test functions of the parser which can be found in the `it` function in the tests file.
