# luminate-alfred-workflow

This is a workflow for Alfred 4 (or Alfred 3) that can be used to interact with Symantec Secure Access Cloud (Luminate).

## Installation
* Install Node.js (>=8.0.0).
* Clone/fork this repo
* Run the build script `npm run build`
* Configure `LUMINATE_URL` environment variable in Alfred plugins to point to your Luminate tenant.
* Try to run either `lhttp` or `lssh` and login to your tenant.

## Features
* Access HTTP applications using `lhttp` command
* Access SSH applications using `lssh` command