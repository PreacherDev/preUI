-- The in-game theme editor of this example (/themeeditor). Other resources only need bridge.lua.

local open = false

local function setOpen(state)
  open = state
  SetNuiFocus(state, state)
  SendNUIMessage({ action = 'setVisible', data = state })
end

RegisterCommand('themeeditor', function()
  setOpen(not open)
end, false)

-- Escape in the UI (useNuiVisibility) calls this.
RegisterNUICallback('close', function(_, cb)
  setOpen(false)
  cb({})
end)

-- "Save" in the editor: the server checks the permission and updates GlobalState.theme for everyone.
RegisterNUICallback('saveTheme', function(payload, cb)
  TriggerServerEvent('preui_theme:save', payload)
  cb({ ok = true })
end)
