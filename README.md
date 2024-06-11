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
-   [Git Credential Manager](https://github.com/git-ecosystem/git-credential-manager)

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
