-- The window: Config.Command opens it, the UI closes itself (Escape or X) through the close callback.

local isOpen = false

-- Demo data for the window. Replace it with your own, e.g. from the server with PreLib.awaitCallback.
local ITEMS = {
    { id = 1, label = 'items.water', price = 5, stock = 42 },
    { id = 2, label = 'items.sandwich', price = 12, stock = 1 },
    { id = 3, label = 'items.first_aid', price = 150, stock = 0 },
}

local function findItem(id)
    for _, item in ipairs(ITEMS) do
        if item.id == id then
            return item
        end
    end
end

local function setOpen(state)
    isOpen = state
    SendNUIMessage({ action = 'setVisible', data = state })
    SetNuiFocus(state, state)
end

if Config.Command then
    RegisterCommand(Config.Command, function()
        setOpen(not isOpen)
    end, false)
end

-- The UI has already hidden itself
RegisterNUICallback('close', function(_, cb)
    isOpen = false
    SetNuiFocus(false, false)
    cb({})
end)

RegisterNUICallback('getData', function(_, cb)
    local items = {}
    for i, item in ipairs(ITEMS) do
        items[i] = { id = item.id, label = PreLib.locale(item.label), price = item.price, stock = item.stock }
    end

    cb({ items = items })
end)

-- The UI only sends the id. Demo only: a real script asks the server, which checks the price and the money.
RegisterNUICallback('buy', function(data, cb)
    local item = type(data) == 'table' and findItem(data.id)
    if not item or item.stock <= 0 then
        cb({ ok = false })
        return
    end

    -- While the window has the focus, pre_lib hands this to the page (NuiToastRelay in web/src/App.tsx)
    exports.pre_lib:notify({
        description = PreLib.locale('notify.bought', {
            item = PreLib.locale(item.label),
            amount = PreLib.formatMoney(item.price),
        }),
        type = 'success',
    })
    cb({ ok = true })
end)

-- Never leave the player stuck with the NUI focus when the resource stops while the window is open
AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() and isOpen then
        SetNuiFocus(false, false)
    end
end)
