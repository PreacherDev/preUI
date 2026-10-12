fx_version('cerulean')
game('gta5')
lua54('yes')

name('__NAME__')
description('NUI built with preUI on pre_lib')
version('1.0.0-beta.1')

dependency('pre_lib')
pre_lib_min_version('1.5.0')

shared_scripts({
    '@pre_lib/init.lua',
    'config.lua',
})

-- nui_bridge.lua answers the UI's getTheme, getLocale, getTexts and getCurrency callbacks and hands pre_lib's
-- notifications to this page while it has the focus.
client_scripts({
    '@pre_lib/nui_bridge.lua',
    'client/main.lua',
})

ui_page('web/dist/index.html')

files({
    'locales/*.lua',
    'web/dist/index.html',
    'web/dist/assets/*',
})

escrow_ignore({
    'config.lua',
    'locales/*.lua',
})
