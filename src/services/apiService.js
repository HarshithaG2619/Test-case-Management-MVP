const API_BASE = 'http://localhost:4000';

// --- PROJECTS ---
export const getProjects = async () => {
  const res = await fetch(`${API_BASE}/projects`);
  return res.json();
};

export const createProject = async (data) => {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateProject = async (id, data) => {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteProject = async (id) => {
  const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
  return res.json();
};

// --- DOCUMENTS ---
export const getDocuments = async (projectId) => {
  const res = await fetch(`${API_BASE}/documents?projectId=${projectId}`);
  return res.json();
};

export const createDocument = async (data) => {
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteDocument = async (id) => {
  const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
  return res.json();
};

// --- TEMPLATES ---
export const getTemplates = async (projectId) => {
  const res = await fetch(`${API_BASE}/templates?projectId=${projectId}`);
  return res.json();
};

export const createTemplate = async (data) => {
  const res = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteTemplate = async (id) => {
  const res = await fetch(`${API_BASE}/templates/${id}`, { method: 'DELETE' });
  return res.json();
};

// --- TEST CASES ---
export const getTestCases = async (projectId) => {
  const res = await fetch(`${API_BASE}/testcases?projectId=${projectId}`);
  return res.json();
};

export const createTestCase = async (data) => {
  const res = await fetch(`${API_BASE}/testcases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateTestCase = async (id, data) => {
  const res = await fetch(`${API_BASE}/testcases/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteTestCase = async (id) => {
  const res = await fetch(`${API_BASE}/testcases/${id}`, { method: 'DELETE' });
  return res.json();
}; 