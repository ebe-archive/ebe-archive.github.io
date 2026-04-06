# Azure App Registration Setup

This guide uses the Azure CLI in **zsh** to create and configure an Azure AD app registration. Each section is self-contained — copy/paste only what you need and skip what doesn't apply.

> **UI alternative:** Most steps in this guide can also be done in the Azure portal under **Azure Active Directory > App registrations**. If you only need to look something up (like your app's client ID), the portal is often the quickest option. Where relevant, UI shortcuts are noted inline.

---

## Prerequisites

- Azure CLI installed (`az --version`) and logged in (`az login`)
- Permission to create app registrations in your Azure AD tenant
- Permission to grant admin consent (Global Administrator or Application Administrator role)

Run this once per session to enable `#` comments in interactive zsh:

```bash
setopt INTERACTIVE_COMMENTS
```

---

## Section 1: Set variables

This attempts to derive the app name and URL from your git remote, assuming you are hosting on GitHub Pages and the repo is named `<org>.github.io`. If that doesn't apply, skip the dynamic block and set the variables manually instead.

> **Note:** The dynamic block below must be run from within the repo folder so git can find the remote. All other sections can be run from anywhere.

```bash
# Derive from git remote (assumes GitHub Pages hosting with a <org>.github.io repo)
REPO_REMOTE=$(git remote get-url origin)
APP_NAME=$(echo $REPO_REMOTE | sed 's/.*github.com[/:]//' | sed 's/\.git$//' | sed 's/.*\///')
APP_URL="https://$APP_NAME"

# Verify — should look like: ebe-archive.github.io / https://ebe-archive.github.io
echo "App name: $APP_NAME"
echo "App URL:  $APP_URL"
```

Or set manually:

```bash
APP_NAME="your-app-name"       # used as the display name in Azure AD
APP_URL="https://your-app-url" # your hosted app URL (e.g. GitHub Pages, custom domain, etc.)
```

---

## Section 2 (Optional): Find existing app registration

Skip this if there is no existing app registration to clean up.

```bash
EXISTING_APP=$(az ad app list --display-name "$APP_NAME" --query "[?displayName=='$APP_NAME'].appId" -o tsv)
if [ -n "$EXISTING_APP" ]; then
  echo "Found existing app: $EXISTING_APP"
else
  echo "No existing app found"
fi
```

If you found an existing app and want to delete it, proceed to Section 2a. Otherwise skip to Section 3.

---

## Section 2a (Optional): Delete existing app registration

> **Warning:** This is permanent and irreversible. Deleting an app registration immediately revokes all existing consent grants, credentials, and tokens for every user. Make sure `$EXISTING_APP` contains the correct app ID before running this.

```bash
echo "About to delete app: $EXISTING_APP"
echo "Press Ctrl+C to cancel, or Enter to continue"
read confirm
az ad app delete --id $EXISTING_APP
echo "Deleted $EXISTING_APP"
```

> **UI alternative:** Portal > Azure AD > App registrations > find your app > Delete.

---

## Section 3 (Optional): Create app registration

Skip this if you already have an app registration and set `APP_ID` manually:

```bash
APP_ID="your-existing-client-id"
echo "Using existing app: $APP_ID"
```

> **UI alternative:** To find your client ID in the portal, go to Azure AD > App registrations > your app > Overview.

Otherwise, create it:

```bash
APP_ID=$(az ad app create \
  --display-name "$APP_NAME" \
  --sign-in-audience AzureADMyOrg \
  --spa-redirect-uris "$APP_URL" "http://localhost" \
  --query appId -o tsv)
echo "Created app ID: $APP_ID"
```

> **Note on redirect URIs:** `http://localhost` (no port) covers local development — Azure AD treats localhost as a special case and matches any port. See [Microsoft's localhost exceptions docs](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url#localhost-exceptions) for details. If you have additional environments (staging, preview, etc.) add their URLs here:
> ```bash
> az ad app update --id $APP_ID --spa-redirect-uris "$APP_URL" "http://localhost" "https://your-other-env"
> ```

Create the service principal (required for consent grants):

```bash
az ad sp create --id $APP_ID
echo "Service principal created"
```

Verify:

```bash
az ad app show --id $APP_ID --query "spa.redirectUris" -o json
```

---

## Section 4: Look up API service principal and scope IDs

Required before Sections 5 and 6.

```bash
# Look up service principal IDs
COSMOS_SP=$(az ad sp list --display-name "Azure Cosmos DB" --query "[?displayName=='Azure Cosmos DB'].appId" -o tsv)
STORAGE_SP=$(az ad sp list --display-name "Azure Storage" --query "[?displayName=='Azure Storage'].appId" -o tsv)
GRAPH_SP=$(az ad sp list --display-name "Microsoft Graph" --query "[?displayName=='Microsoft Graph'].appId" -o tsv)

echo "Cosmos:  $COSMOS_SP"
echo "Storage: $STORAGE_SP"
echo "Graph:   $GRAPH_SP"
```

```bash
# Look up scope IDs for the specific permissions we need
COSMOS_SCOPE=$(az ad sp show --id $COSMOS_SP --query "oauth2PermissionScopes[?value=='user_impersonation'].id" -o tsv)
STORAGE_SCOPE=$(az ad sp show --id $STORAGE_SP --query "oauth2PermissionScopes[?value=='user_impersonation'].id" -o tsv)
GRAPH_SCOPE=$(az ad sp show --id $GRAPH_SP --query "oauth2PermissionScopes[?value=='User.Read'].id" -o tsv)

echo "Cosmos scope:  $COSMOS_SCOPE"
echo "Storage scope: $STORAGE_SCOPE"
echo "Graph scope:   $GRAPH_SCOPE"
```

---

## Section 5 (Optional): Remove existing permissions

Skip this if you just created the app in Section 3.

**Option A — Remove all permissions from this app** (use when starting fresh):

```bash
az ad app permission list --id $APP_ID --query "[].resourceAppId" -o tsv | while read api; do
  az ad app permission delete --id $APP_ID --api $api
  echo "Removed permissions for $api"
done
```

**Option B — Remove only these three permissions** (use when other permissions should stay):

```bash
az ad app permission delete --id $APP_ID --api $COSMOS_SP
az ad app permission delete --id $APP_ID --api $STORAGE_SP
az ad app permission delete --id $APP_ID --api $GRAPH_SP
echo "Done"
```

---

## Section 6: Add permissions and grant consent

Permissions are added and consented one at a time to avoid duplicates.

```bash
az ad app permission add --id $APP_ID --api $COSMOS_SP --api-permissions $COSMOS_SCOPE=Scope
az ad app permission grant --id $APP_ID --api $COSMOS_SP --scope user_impersonation

az ad app permission add --id $APP_ID --api $STORAGE_SP --api-permissions $STORAGE_SCOPE=Scope
az ad app permission grant --id $APP_ID --api $STORAGE_SP --scope user_impersonation

az ad app permission add --id $APP_ID --api $GRAPH_SP --api-permissions $GRAPH_SCOPE=Scope
az ad app permission grant --id $APP_ID --api $GRAPH_SP --scope User.Read

echo "Done. Verify in the portal: App registrations > $APP_NAME > API permissions"
```

> **Skipping consent:** The `permission grant` commands above grant tenant-wide admin consent so users never see a consent prompt. If you prefer each user to grant their own consent on first login, omit the `permission grant` lines and run only the `permission add` lines. Users will be prompted to approve access the first time they sign in.

> **UI alternative:** Portal > App registrations > your app > API permissions > Grant admin consent for \<tenant\>.

---

## Section 7: Update app configuration

If you created a new app in Section 3, update `src/stores/config/config.js` with the new IDs.

Get your tenant ID:

```bash
az account show --query tenantId -o tsv
```

Then update the file:

```js
export const login = {
  tenantId: "your-tenant-id",
  clientId: "your-app-id",  // value of $APP_ID from above
  loginStyle: "redirect"
};
```
