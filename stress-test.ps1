param (
    [string]$url = "http://ec2-13-211-77-212.ap-southeast-2.compute.amazonaws.com:3000/terrain/get3DTerrain?id=2&styleQuery=basic",
    [int]$requestCount = 8,
    [string]$jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidU5hbWUiOiJKb2huRG9lIiwiaWF0IjoxNzU2NTYxNTEwLCJleHAiOjE3NTY1NjMzMTB9.q2ONuKxoSByzXWqaz06iIafxcO3-AN6x0mj1hqBNPQk"
)

Write-Output "Sending $requestCount requests to $url"

$jobs = @()

for ($i = 1; $i -le $requestCount; $i++) {
    $jobs += Start-Job -ScriptBlock {
        param($url, $token)

        $handler = New-Object System.Net.Http.HttpClientHandler
        $client = New-Object System.Net.Http.HttpClient($handler)
        $client.Timeout = [System.Threading.Timeout]::InfiniteTimeSpan

        if ($token -ne "") {
            $client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $token)
        }

        try {
            $response = $client.GetAsync($url).Result
            Write-Output "[$($response.StatusCode)] Success - $url"
        }
        catch {
            Write-Warning "Request failed: $_"
        }

        $client.Dispose()
    } -ArgumentList $url, $jwtToken
}

# Wait for all jobs to finish
$jobs | ForEach-Object {
    Wait-Job $_
    Receive-Job $_
    Remove-Job $_
}
