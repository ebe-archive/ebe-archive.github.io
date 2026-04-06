export const login = {
  tenantId: "343581ac-7887-44b2-91c3-96c7fc5b4a6d",
  clientId: "7ee0bf42-9bf2-4e9b-92a3-3a55c3df9a1b",
  loginStyle: "redirect"
};
export const cosmos = {
  endpoint: "https://frtl.documents.azure.com",
  databaseId: "ebe",
  tenantId: login.tenantId,
  clientId: login.clientId,
};
export const storage = {
  endpoint: "https://frtlcool.blob.core.windows.net",
  containerId: "ebe",
  tenantId: login.tenantId,
  clientId: login.clientId,
};