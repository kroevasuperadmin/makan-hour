# Grok sign-in on rizqey-team2

Faris is away. A helper starts sign-in on the Daytona machine named `rizqey-team2`. The command prints a link and a one-time code. The helper posts those two things. Faris opens the link and types the code. The laptop copy of Grok is a different login. This page is only for the Daytona machine.

This page has no keys and no passwords. Leave every secret where it is. Do not deploy the app. Do not create, delete, or stop the machine.

## Where the Daytona key lives

The key is the variable `DAYTONA_API_KEY` in the file `~/.model-keys.env`, in the home directory that holds the team keys. Load the file into the shell so the Daytona command can read it:

```bash
set -a
. ~/.model-keys.env
set +a
```

Leave the file closed. Do not print `DAYTONA_API_KEY`, and do not pass it with `--api-key` or any other flag. After this, `daytona` uses the loaded variable on its own.

You need the `daytona` command on that same computer. If the shell cannot find it, install the CLI from the Daytona docs, then come back to this page.

## What to run

Check the machine, start it if it is stopped, and open a shell on it:

```bash
daytona list
daytona start rizqey-team2
daytona ssh rizqey-team2
```

If the list already shows `rizqey-team2` as started, skip `daytona start` and SSH in. Stay in this SSH session until Faris has finished. Sign-in waits in this window.

On the machine, see if Grok is there:

```bash
command -v grok
```

If that prints nothing, install Grok, then start a fresh login shell so `grok` is on the path:

```bash
curl -fsSL https://x.ai/cli/install.sh | bash
exec bash -l
```

Start device sign-in and leave it running:

```bash
grok login --device-auth
```

The command prints a sign-in link and a short one-time code, then waits. Copy both before you do anything else. If the code expires, press Ctrl-C, run the same command again, and use the new link and the new code.

When Faris has approved it, the command stops waiting and returns to the shell. That is a finished sign-in. Close the SSH session with `exit`.

## What the helper posts

Post two lines to Faris, in the chat you already use with him:

1. The sign-in link the command printed.
2. The one-time code the command printed.

Add the machine name, `rizqey-team2`, so he knows which sign-in he is approving. The Daytona key stays in `~/.model-keys.env`. The post is the link and the code.

## What Faris does

On a phone or laptop with a browser:

1. Open the link.
2. Sign in with his Grok account if the page asks.
3. Type the one-time code and approve the sign-in.
4. Reply that it is done.

The helper waits on the SSH session until `grok login --device-auth` returns to the shell.
