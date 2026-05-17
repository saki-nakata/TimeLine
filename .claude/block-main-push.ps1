$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$cmd = $json.tool_input.command
if ($cmd -match 'git\s+push' -and $cmd -match '\bmain\b') {
    $result = @{
        'continue' = $false
        stopReason = 'main への直接プッシュは禁止されています。PR を作成してください。'
    } | ConvertTo-Json -Compress
    Write-Output $result
    exit 2
}
