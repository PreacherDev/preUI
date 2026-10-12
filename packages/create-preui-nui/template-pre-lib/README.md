# __NAME__

One to three sentences: what the script does for the server and its players.

## Requirements

| Resource | Notes |
|---|---|
| pre_lib 1.5.0 or newer | required |

## Installation

1. Put `__NAME__` into your resources and start it after pre_lib:

   ```cfg
   ensure pre_lib
   ensure __NAME__
   ```

2. Start the server.

## Configuration

`config.lua` holds the settings, `locales/` the texts (`en`, `de`, `fr`). Language, currency and colours come from
pre_lib.

| Key | Default | What it does |
|---|---|---|
| `Command` | `'__NAME__'` | Opens the window. `false` = no command. |

## Commands

| Command | Who | What |
|---|---|---|
| `/__NAME__` | everyone | Opens the window. The name is `Config.Command`. |

## Updating

Replace every file except `config.lua` and `locales/`. Read the "Updating from" section of the CHANGELOG for your old
version. If files were added, run `refresh` and `ensure __NAME__`.

## Licenses

Third-party licenses of the bundled UI are in `THIRD_PARTY_LICENSES.txt`.
