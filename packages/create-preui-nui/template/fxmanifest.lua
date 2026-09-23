fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name '__NAME__'
description '__T_RESOURCE_DESCRIPTION__'
version '0.1.0'

-- @preui-theme:start
-- Server-wide theme: preui_theme (examples/fivem-theme in the preUI repo, or any core resource implementing the
-- preUI theme protocol v1) must be started before this resource. The include answers getTheme and forwards changes.
dependency 'preui_theme'
client_script '@preui_theme/bridge.lua'
-- @preui-theme:end
client_script 'client.lua'

-- Built by `npm run build` in web/ (not in git, see README).
ui_page 'web/dist/index.html'

files {
  'web/dist/index.html',
  'web/dist/assets/*',
}
