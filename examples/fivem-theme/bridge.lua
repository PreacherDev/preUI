-- preUI theme bridge (client). Add it to every resource whose NUI uses <NuiThemeBridge />:
--
--   client_script '@preui_theme/bridge.lua'
--
-- It answers the NUI's "getTheme" request on start and forwards every change of GlobalState.theme as a
-- "setTheme" message. SendNUIMessage only reaches the NUI frame of the resource that calls it, which is why each
-- resource needs its own copy of this code (via the @ include above).

RegisterNUICallback('getTheme', function(_, cb)
  cb(GlobalState.theme or {})
end)

AddStateBagChangeHandler('theme', 'global', function(_, _, value)
  SendNUIMessage({ action = 'setTheme', data = value or {} })
end)

-- The server language for useNuiLocale() (@pre_scripts/preui-nui). ox_lib servers set it with `setr ox:locale de`.
RegisterNUICallback('getLocale', function(_, cb)
  cb(GetConvar('ox:locale', GetConvar('preui:locale', 'en')))
end)
