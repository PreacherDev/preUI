fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'preui_theme'
description 'preUI example: one server-wide theme for every NUI, edited live in game'
version '0.1.0'

-- GlobalState.theme owner + permission check
server_script 'server.lua'

-- bridge.lua is the part every UI resource needs; this resource uses it for its own editor too
client_scripts {
  'bridge.lua',
  'client.lua',
}

ui_page 'web/dist/index.html'

files {
  'web/dist/index.html',
  'web/dist/assets/*',
}
