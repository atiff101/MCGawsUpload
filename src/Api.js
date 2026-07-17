const API_BASE = "https://ni6rkidbi0.execute-api.eu-west-2.amazonaws.com";

function authHeaders(idToken) {
  return { Authorization: `Bearer ${idToken}` };
}

async function asJson(res) {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function listInstallations(idToken) {
  const res = await fetch(`${API_BASE}/installations`, {
    headers: authHeaders(idToken),
  });
  const data = await asJson(res);
  return Array.isArray(data) ? data : [];
}

export async function createInstallation(data, idToken) {
  const res = await fetch(`${API_BASE}/installations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(data),
  });
  return asJson(res);
}

export async function updateInstallation(id, data, idToken) {
  const res = await fetch(`${API_BASE}/installations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(data),
  });
  return asJson(res);
}

export async function deleteInstallation(id, idToken) {
  const res = await fetch(`${API_BASE}/installations/${id}`, {
    method: "DELETE",
    headers: authHeaders(idToken),
  });
  return asJson(res);
}

export async function uploadDocument(file, idToken) {
  const res = await fetch(`${API_BASE}/uploads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify({ filename: file.name }),
  });
  const { uploadUrl, key } = await asJson(res);

  const put = await fetch(uploadUrl, { method: "PUT", body: file });
  if (!put.ok) throw new Error(`Upload failed: ${put.status}`);

  return { key, filename: file.name };
}

export async function getDownloadUrl(key, idToken) {
  const res = await fetch(
    `${API_BASE}/downloads?key=${encodeURIComponent(key)}`,
    { headers: authHeaders(idToken) },
  );
  const { downloadUrl } = await asJson(res);
  return downloadUrl;
}

// --- Supplier catalogue ------------------------------------------------

export async function listCatalogue(idToken) {
  const res = await fetch(`${API_BASE}/catalogue`, {
    headers: authHeaders(idToken),
  });
  const data = await asJson(res);
  return Array.isArray(data) ? data : [];
}

// --- Data sharing ------------------------------------------------------

export async function listIncomingRequests(idToken) {
  const res = await fetch(`${API_BASE}/requests`, {
    headers: authHeaders(idToken),
  });
  const data = await asJson(res);
  return Array.isArray(data) ? data : [];
}

export async function listOutgoingRequests(idToken) {
  const res = await fetch(`${API_BASE}/requests/outgoing`, {
    headers: authHeaders(idToken),
  });
  const data = await asJson(res);
  return Array.isArray(data) ? data : [];
}

export async function createDataRequest(payload, idToken) {
  const res = await fetch(`${API_BASE}/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(payload),
  });
  return asJson(res);
}

export async function decideRequest(requestId, payload, idToken) {
  const res = await fetch(`${API_BASE}/requests/${requestId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(payload),
  });
  return asJson(res);
}

export async function getSharedData(installationId, idToken) {
  const res = await fetch(`${API_BASE}/shared-data/${installationId}`, {
    headers: authHeaders(idToken),
  });
  return asJson(res);
}
