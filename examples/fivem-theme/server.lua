-- One theme for the whole server, stored in a global state bag. Every client (and every resource on it) sees
-- changes immediately. Persist it however you like (KVP here, a database in a real setup).

local KVP_KEY = 'preui_theme'

-- Protocol v1, see packages/preui-nui/README.md ("Theme message").
-- The message is the complete theme state: no palette/tokens = preUI defaults, theme '' = no data-theme.
local defaultTheme = {
  v = 1,
  scheme = 'dark',
  theme = '',
}

local function loadTheme()
  local raw = GetResourceKvpString(KVP_KEY)
  if raw then
    local ok, decoded = pcall(json.decode, raw)
    if ok and type(decoded) == 'table' then return decoded end
  end
  return defaultTheme
end

GlobalState.theme = loadTheme()

-- Only admins may change the server theme: `add_ace group.admin preui.theme allow` in server.cfg.
RegisterNetEvent('preui_theme:save', function(payload)
  local src = source
  if not IsPlayerAceAllowed(src, 'preui.theme') then
    print(('[preui_theme] %s tried to change the theme without permission'):format(GetPlayerName(src)))
    return
  end
  if type(payload) ~= 'table' then return end

  -- Keep only the known fields; the NUI side validates every colour again (applyTokens drops invalid values).
  local theme = {
    v = 1,
    scheme = (payload.scheme == 'light' or payload.scheme == 'dark' or payload.scheme == 'system') and payload.scheme or 'dark',
    theme = type(payload.theme) == 'string' and payload.theme or '',
    palette = type(payload.palette) == 'table' and payload.palette or nil,
    tokens = type(payload.tokens) == 'table' and payload.tokens or nil,
  }

  GlobalState.theme = theme
  SetResourceKvp(KVP_KEY, json.encode(theme))
end)

RegisterCommand('resettheme', function(src)
  if src ~= 0 and not IsPlayerAceAllowed(src, 'preui.theme') then return end
  GlobalState.theme = defaultTheme
  DeleteResourceKvp(KVP_KEY)
end, false)
