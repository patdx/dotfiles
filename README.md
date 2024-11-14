# dotfiles

This repository contains my preferred settings for new development environments.

## System

### git

For git I don't have a config file, I just run the following script to update
the global config.

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
    (See next section)

#### Install Git Credential Manager on Linux

While Git Credential Manager does provide a .dev, they sadly don't provide a
.rpm for Fedora users.

I've prepared a simple script to install it on Linux. I nstall Deno then run the
following command:

```sh
deno run -A jsr:@patdx/dotfiles/install-gcm-linux
```

You can check the source here:
https://github.com/patdx/dotfiles/blob/main/install-gcm-linux.ts

The original instructions are here:
https://github.com/git-ecosystem/git-credential-manager/blob/release/docs/install.md#tarball

#### Installing Zipped Binaries on Linux

It can be inconvenient when tools just provide a zipped binary and ask you to install it.

Use the "update" script to automatically download and install a zipped binary to `~/.local/bin`.

It will also update your .zshrc or .bashrc to add the path to the binary.

Example for DuckDB:

```sh
deno run -A jsr:@patdx/dotfiles/install-binary https://github.com/duckdb/duckdb/releases/download/v1.1.2/duckdb_cli-linux-amd64.zip duckdb
```

#### Doing updates on Linux

I have a script to do my preferred updates on Linux. It will also upgrade your
git-credential-manager version using the script above as needed.

##### Use the latest version

It is recommended to use the `--reload` flag to ensure you are using the latest version.

```sh
deno run -A --reload jsr:@patdx/dotfiles/update
```

##### Use a specific version

```sh
deno run -A jsr:@patdx/dotfiles@0.1.7/update
```

### Python

~~As I don't use python so much, I think it's nice to use pipx:~~

~~https://pipx.pypa.io/stable/~~

Update: I tried pipx and then I could not install extension
`aider-chat[browser]`. It did not make anything easier.

In order to intall python tool such as aider:

https://aider.chat/docs/install/pipx.html

## Software Projects

### .editorconfig

While I do like indent of 2 spaces, it makes it a pain to do nested lists in
Markdown together with Prettier. Therefore I prefer 4 spaces for Markdown.

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
