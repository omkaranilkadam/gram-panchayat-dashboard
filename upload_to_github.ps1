$ErrorActionPreference = 'Stop'

# Prompt for the PAT securely
Write-Host "Please create a classic GitHub Personal Access Token (PAT) with 'repo' scope at: https://github.com/settings/tokens/new"
$tokenSecure = Read-Host -Prompt 'Enter your GitHub PAT (typing hidden)' -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($tokenSecure)
$token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$repoName = "gram-panchayat-dashboard"
$username = "omkaranilkadam"

# Create the repository on GitHub via API
Write-Host "Creating repository $repoName on GitHub..."
$headers = @{
    "Authorization" = "token $token"
    "Accept"        = "application/vnd.github.v3+json"
}
$body = @{
    "name"        = $repoName
    "description" = "Gram Panchayat Dashboard"
    "private"     = $false
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body
    Write-Host "Repository created successfully at $($response.html_url)"
} catch {
    $err = $_.ErrorDetails.Message
    if ($err -match "name already exists") {
        Write-Host "Repository already exists on GitHub. Continuing..."
    } else {
        Write-Host "Error creating repository: $_"
        exit
    }
}

# Set remote and push
Write-Host "Pushing code to GitHub..."
git remote remove origin 2>$null
git remote add origin "https://${username}:${token}@github.com/${username}/${repoName}.git"
git branch -M main
git push -u origin main

Write-Host "Done! Your code is now live on GitHub."

# Cleanup
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
$token = ""
