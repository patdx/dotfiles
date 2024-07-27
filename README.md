# dotfiles

This repository contains my preferred settings for new development environments.

## System

### git

For git I don't have a config file, I just run the following script to update the global config.

```sh
git config --global init.defaultBranch main
git config --global pull.ff only
git config --global rebase.autoStash true
git config --global core.editor "code --wait"
```

### Software to Install

-   git
-   git-lfs
-   VS Code
-   [Git Credential Manager](https://github.com/git-ecosystem/git-credential-manager) (See next section)

#### Install Git Credential Manager on Linux

While Git Credential Manager does provide a .dev, they sadly don't provide a .rpm for Fedora users.

I've prepared a simple script to install it on Linux. After [installing Bun](https://bun.sh/docs/installation), run the following script:

```sh
curl https://raw.githubusercontent.com/patdx/dotfiles/main/install-gcm-linux.ts | bun run -
```

You can check the source here: https://github.com/patdx/dotfiles/blob/main/install-gcm-linux.ts

The original instructions are here: https://github.com/git-ecosystem/git-credential-manager/blob/release/docs/install.md#tarball

## Software Projects

### .editorconfig

While I do like indent of 2 spaces, it makes it a pain to do nested lists in Markdown together with Prettier. Therefore I prefer 4 spaces for Markdown.

```editorconfig
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
indent_size = 4
```
