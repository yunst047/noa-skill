# noa - statusline badge (Windows). Prints the active mode if the flag exists,
# combined with her Seminar sisters when they are active too:
#   [NOA:NOTEBOOK|YUUKA:LEDGER|KOYUKI:NIHAHA]
# Reads %CLAUDE_CONFIG_DIR%\.noa-active / .yuuka-active / .koyuki-active or ~\.claude\...

$claudeDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }

function Read-Flag($name) {
  $flag = Join-Path $claudeDir $name
  if (-not (Test-Path $flag)) { return "" }
  $raw = Get-Content $flag -Raw -ErrorAction SilentlyContinue
  if ($null -eq $raw) { return "" }
  return $raw.Trim()
}

$badges = @()

$mode = Read-Flag ".noa-active"
if ($mode) {
  $badges += "NOA:" + $(switch ($mode) {
    "lite"  { "MEMO" }
    "full"  { "NOTEBOOK" }
    "ultra" { "VERBATIM" }
    default { $mode.ToUpper() }
  })
}

$ymode = Read-Flag ".yuuka-active"
if ($ymode) {
  $badges += "YUUKA:" + $(switch ($ymode) {
    "lite"  { "ALLOWANCE" }
    "full"  { "LEDGER" }
    "ultra" { "DEFICIT" }
    default { $ymode.ToUpper() }
  })
}

$kmode = Read-Flag ".koyuki-active"
if ($kmode) {
  $badges += "KOYUKI:" + $(switch ($kmode) {
    "lite"  { "CHILL" }
    "full"  { "NIHAHA" }
    "ultra" { "NIHAHAHACK" }
    default { $kmode.ToUpper() }
  })
}

if ($badges.Count -eq 0) { exit 0 }
Write-Host -NoNewline ("[" + ($badges -join "|") + "]")
