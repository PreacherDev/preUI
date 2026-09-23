-- /__NAME__ toggles the UI. The web part lives in web/ (React + preUI), built to web/dist.

local open = false

local function setOpen(state)
  open = state
  SetNuiFocus(state, state)
  SendNUIMessage({ action = 'setVisible', data = state })
end

RegisterCommand('__NAME__', function()
  setOpen(not open)
end, false)

-- Escape in the UI (useNuiVisibility) and the close button call this: release the focus.
RegisterNUICallback('close', function(_, cb)
  setOpen(false)
  cb({})
end)

-- fetchNui('getData') in web/src/App.tsx. Demo data: replace it with your own (e.g. from the server via a callback).
RegisterNUICallback('getData', function(_, cb)
  cb({
    player = GetPlayerName(PlayerId()),
    cash = 2500,
    items = {
      { id = 1, label = '__T_ITEM_1__', price = 5, stock = 42 },
      { id = 2, label = '__T_ITEM_2__', price = 12, stock = 8 },
      { id = 3, label = '__T_ITEM_3__', price = 150, stock = 0 },
      { id = 4, label = '__T_ITEM_4__', price = 400, stock = 3 },
    },
  })
end)

-- Never leave the player stuck with the NUI focus when the resource restarts while the UI is open.
AddEventHandler('onResourceStop', function(resource)
  if resource == GetCurrentResourceName() and open then
    SetNuiFocus(false, false)
  end
end)
