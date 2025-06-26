console.log('=== STARTING GCS BACKEND ===');

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Storage } from '@google-cloud/storage';
import { Firestore } from '@google-cloud/firestore';
import path from 'path';

// Load env vars
dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// GCS setup
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

// Firestore setup
const firestore = new Firestore({
  projectId: process.env.FIRESTORE_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Health check
app.get('/', (req, res) => res.send('GCS backend running'));

// Generate signed upload URL
app.post('/generate-upload-url', async (req, res) => {
  try {
    const { fileName, contentType } = req.body;
    if (!fileName) return res.status(400).json({ error: 'fileName required' });
    const file = bucket.file(fileName);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 min
      contentType: contentType || 'application/octet-stream',
    });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate signed download URL
app.post('/generate-download-url', async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) return res.status(400).json({ error: 'fileName required' });
    const file = bucket.file(fileName);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 min
    });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Example: Save file metadata to Firestore
app.post('/save-metadata', async (req, res) => {
  try {
    const { collection, data } = req.body;
    if (!collection || !data) return res.status(400).json({ error: 'collection and data required' });
    const docRef = await firestore.collection(collection).add(data);
    res.json({ id: docRef.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PROJECTS CRUD ---
app.get('/projects', async (req, res) => {
  try {
    const snapshot = await firestore.collection('projects').get();
    const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/projects', async (req, res) => {
  try {
    console.log('POST /projects body:', req.body);
    const data = req.body;
    const docRef = await firestore.collection('projects').add({ ...data, createdAt: new Date().toISOString(), lastModified: new Date().toISOString() });
    res.json({ id: docRef.id });
  } catch (err) {
    console.error('Error in POST /projects:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await firestore.collection('projects').doc(id).update({ ...data, lastModified: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection('projects').doc(id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DOCUMENTS CRUD ---
app.get('/documents', async (req, res) => {
  try {
    const { projectId } = req.query;
    let ref = firestore.collection('documents');
    if (projectId) ref = ref.where('projectId', '==', projectId);
    const snapshot = await ref.get();
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/documents', async (req, res) => {
  try {
    const data = req.body;
    const docRef = await firestore.collection('documents').add({ ...data, uploadedAt: new Date().toISOString() });
    res.json({ id: docRef.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection('documents').doc(id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TEMPLATES CRUD ---
app.get('/templates', async (req, res) => {
  try {
    const { projectId } = req.query;
    let ref = firestore.collection('templates');
    if (projectId) ref = ref.where('projectId', '==', projectId);
    const snapshot = await ref.get();
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/templates', async (req, res) => {
  try {
    const data = req.body;
    const docRef = await firestore.collection('templates').add({ ...data, uploadedAt: new Date().toISOString() });
    res.json({ id: docRef.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection('templates').doc(id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TEST CASES CRUD ---
app.get('/testcases', async (req, res) => {
  try {
    const { projectId } = req.query;
    let ref = firestore.collection('testcases');
    if (projectId) ref = ref.where('projectId', '==', projectId);
    const snapshot = await ref.get();
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/testcases', async (req, res) => {
  try {
    const data = req.body;
    const docRef = await firestore.collection('testcases').add({ ...data, lastModified: new Date().toISOString() });
    res.json({ id: docRef.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/testcases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await firestore.collection('testcases').doc(id).update({ ...data, lastModified: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/testcases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection('testcases').doc(id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/test-firestore', async (req, res) => {
  try {
    const snapshot = await firestore.collection('projects').limit(1).get();
    res.json({ success: true, count: snapshot.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`GCS backend listening on port ${PORT}`)); 