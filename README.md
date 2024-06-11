# dotfiles

This repository contains my preferred settings for new development environments.

## git

For git I don't have a config file, I just run the following script to update the global config.

```sh
git config --global init.defaultBranch main
git config --global pull.ff only
git config --global rebase.autoStash true
git config --global core.editor "code --wait"
```

## software to install

- git
- git-lfs
- VS Code
- [Git Credential Manager](https://github.com/git-ecosystem/git-credential-manager)
