import React, { useState, useEffect } from 'react';
import {
  getDocuments, createDocument, deleteDocument,
  getTemplates, createTemplate, deleteTemplate,
  getTestCases, createTestCase, updateTestCase, deleteTestCase
} from '../services/apiService';
import { getUploadUrl, uploadFileToGCS, downloadFile, extractFileContent, extractExcelHeaders, generateExcelFile, getDownloadUrl } from '../services/fileService';
import { generateTestCases, modifyTestCases } from '../services/geminiService';
import FileUpload from '../components/FileUpload';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import * as XLSX from 'xlsx';

/**
 * Project view component - manages documents, templates, and test cases
 * @param {Object} project - Project object
 * @param {Function} onBack - Callback to go back to home
 */
const ProjectView = ({ project, onBack }) => {
  const [activeTab, setActiveTab] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingTestCases, setGeneratingTestCases] = useState(false);
  const [modifyingTestCases, setModifyingTestCases] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [currentTestCaseData, setCurrentTestCaseData] = useState([]);
  const [modifyCommand, setModifyCommand] = useState('');
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [sampleTemplateId, setSampleTemplateId] = useState('');
  const [samplePreview, setSamplePreview] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    fetchAll();
  }, [project.id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [docs, temps, tcs] = await Promise.all([
        getDocuments(project.id),
        getTemplates(project.id),
        getTestCases(project.id)
      ]);
      setDocuments(docs);
      setTemplates(temps);
      setTestCases(tcs);
      if (tcs.length > 0) setCurrentTestCaseData(tcs[0].testCaseData);
    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- GCS Backend Upload Logic ---
  const handleDocumentUpload = async (files) => {
    files = Array.isArray(files) ? files : [files];
    for (const file of files) {
      try {
        const storagePath = `projects/${project.id}/documents/${Date.now()}_${file.name}`;
        const uploadUrl = await getUploadUrl(storagePath, file.type);
        await uploadFileToGCS(uploadUrl, file);
        const extractedContent = await extractFileContent(file);
        await createDocument({
          projectId: project.id,
          fileName: file.name,
          storagePath,
          fileType: file.name.split('.').pop().toLowerCase(),
          extractedContent,
          uploadedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error uploading document:', error);
      }
    }
    fetchAll();
  };

  const handleTemplateUpload = async (files) => {
    files = Array.isArray(files) ? files : [files];
    for (const file of files) {
      try {
        const storagePath = `projects/${project.id}/templates/${Date.now()}_${file.name}`;
        const uploadUrl = await getUploadUrl(storagePath, file.type);
        await uploadFileToGCS(uploadUrl, file);
        const columnHeaders = await extractExcelHeaders(file);
        await createTemplate({
          projectId: project.id,
          templateName: file.name,
          storagePath,
          columnHeaders,
          uploadedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error uploading template:', error);
      }
    }
    fetchAll();
  };

  const handleDocumentDownload = async (document) => {
    try {
      await downloadFile(document.storagePath, document.fileName);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleTemplateDownload = async (template) => {
    try {
      await downloadFile(template.storagePath, template.templateName);
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  const handleDocumentDelete = async (documentId) => {
    try {
      await deleteDocument(documentId);
      fetchAll();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleTemplateDelete = async (templateId) => {
    try {
      await deleteTemplate(templateId);
      fetchAll();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  // --- Test Cases CRUD ---
  const handleSampleTemplateChange = async (templateId) => {
    setSampleTemplateId(templateId);
    setSamplePreview(null);
    if (!templateId) return;
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    try {
      // Download the Excel file as ArrayBuffer
      const url = await getDownloadUrl(template.storagePath);
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      // Parse Excel using imported XLSX
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      setSamplePreview({
        headers: json[0] || [],
        rows: [json[1] || [], json[2] || []]
      });
    } catch (err) {
      setSamplePreview({ error: 'Failed to load sample from Excel.' });
    }
  };

  const handleGenerateTestCases = async () => {
    if (selectedDocuments.length === 0 || !selectedTemplate) return;
    setGeneratingTestCases(true);
    try {
      const documentContents = selectedDocuments.map(docId => {
        const doc = documents.find(d => d.id === docId);
        return doc.extractedContent;
      });
      const template = templates.find(t => t.id === selectedTemplate);
      const templateHeaders = template.columnHeaders;
      // Prepare sample for Gemini prompt
      let sampleSection = '';
      if (samplePreview && samplePreview.headers && samplePreview.rows) {
        const nonEmptyRows = (samplePreview.rows || []).filter(row => row && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''));
        const sampleArr = [samplePreview.headers, ...nonEmptyRows];
        if (sampleArr.length > 1) {
          const sampleObjs = sampleArr.slice(1).map(row => {
            const obj = {};
            sampleArr[0].forEach((header, idx) => { obj[header] = row[idx] || ''; });
            return obj;
          });
          sampleSection = `\nHere is a sample test case array for reference:\n${JSON.stringify(sampleObjs, null, 2)}`;
        }
      }
      const generatedTestCases = await generateTestCases(documentContents, templateHeaders, sampleSection, customPrompt);
      await createTestCase({
        projectId: project.id,
        generatedFromDocuments: selectedDocuments,
        generatedFromTemplate: selectedTemplate,
        testCaseData: generatedTestCases,
        lastModified: new Date().toISOString(),
        status: 'Draft',
      });
      setShowGenerateModal(false);
      setSelectedDocuments([]);
      setSelectedTemplate('');
      setSampleTemplateId('');
      setSamplePreview(null);
      setCustomPrompt('');
      fetchAll();
    } catch (error) {
      console.error('Error generating test cases:', error);
    } finally {
      setGeneratingTestCases(false);
    }
  };

  const handleModifyTestCases = async () => {
    if (!modifyCommand.trim() || currentTestCaseData.length === 0) return;
    setModifyingTestCases(true);
    try {
      const modifiedTestCases = await modifyTestCases(currentTestCaseData, modifyCommand);
      setCurrentTestCaseData(modifiedTestCases);
      if (testCases.length > 0) {
        await updateTestCase(testCases[0].id, {
          testCaseData: modifiedTestCases,
        });
        fetchAll();
      }
      setShowModifyModal(false);
      setModifyCommand('');
    } catch (error) {
      console.error('Error modifying test cases:', error);
    } finally {
      setModifyingTestCases(false);
    }
  };

  const handleCellEdit = (rowIndex, columnKey, value) => {
    setEditingCell({ rowIndex, columnKey });
    setEditingValue(value);
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    const { rowIndex, columnKey } = editingCell;
    const updatedData = [...currentTestCaseData];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [columnKey]: editingValue };
    setCurrentTestCaseData(updatedData);
    setEditingCell(null);
    setEditingValue('');
    if (testCases.length > 0) {
      await updateTestCase(testCases[0].id, {
        testCaseData: updatedData,
      });
      fetchAll();
    }
  };

  const handleAddRow = async () => {
    if (currentTestCaseData.length === 0) return;
    const headers = Object.keys(currentTestCaseData[0]);
    const newRow = headers.reduce((acc, header) => {
      acc[header] = '';
      return acc;
    }, {});
    const updatedData = [...currentTestCaseData, newRow];
    setCurrentTestCaseData(updatedData);
    if (testCases.length > 0) {
      await updateTestCase(testCases[0].id, {
        testCaseData: updatedData,
      });
      fetchAll();
    }
  };

  const handleDeleteRow = async (rowIndex) => {
    const updatedData = currentTestCaseData.filter((_, index) => index !== rowIndex);
    setCurrentTestCaseData(updatedData);
    if (testCases.length > 0) {
      await updateTestCase(testCases[0].id, {
        testCaseData: updatedData,
      });
      fetchAll();
    }
  };

  const handleDownloadExcel = () => {
    if (currentTestCaseData.length === 0) return;
    const headers = Object.keys(currentTestCaseData[0]);
    const fileName = `${project.projectName}_TestCases_${new Date().toISOString().split('T')[0]}.xlsx`;
    generateExcelFile(currentTestCaseData, headers, fileName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner message="Loading project..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.projectName}</h1>
                {project.description && (
                  <p className="text-sm text-gray-500">{project.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'documents', name: 'Documents', count: documents.length },
              { id: 'templates', name: 'Templates', count: templates.length },
              { id: 'testcases', name: 'Test Cases', count: testCases.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h2>
              <FileUpload
                onFileSelect={handleDocumentUpload}
                acceptedTypes={['.pdf', '.docx', '.txt', '.xlsx', '.csv']}
                title="Upload Documents (PDF, DOCX, TXT, XLSX, CSV)"
              />
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h2>
              {documents.length === 0 ? (
                <p className="text-gray-500">No documents uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="bg-white p-4 rounded-lg border flex flex-col h-full justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 break-all">{doc.fileName}</h3>
                        <p className="text-sm text-gray-500">{doc.fileType.toUpperCase()}</p>
                      </div>
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={() => handleDocumentDownload(doc)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Templates</h2>
              <FileUpload
                onFileSelect={handleTemplateUpload}
                acceptedTypes={['.xlsx']}
                title="Upload Excel Template (.xlsx)"
              />
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Templates</h2>
              {templates.length === 0 ? (
                <p className="text-gray-500">No templates uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <div key={template.id} className="bg-white p-4 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{template.templateName}</h3>
                          <p className="text-sm text-gray-500">
                            Headers: {template.columnHeaders.join(', ')}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleTemplateDownload(template)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Test Cases Tab */}
        {activeTab === 'testcases' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Test Cases</h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowGenerateModal(true)}
                  disabled={documents.length === 0 || templates.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Generate Test Cases
                </button>
                <button
                  onClick={() => setShowModifyModal(true)}
                  disabled={currentTestCaseData.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Modify with AI
                </button>
                <button
                  onClick={handleDownloadExcel}
                  disabled={currentTestCaseData.length === 0}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Download Excel
                </button>
              </div>
            </div>

            {currentTestCaseData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No test cases generated yet.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Upload documents and templates, then generate test cases using AI.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(currentTestCaseData[0] || {}).map((header) => (
                          <th
                            key={header}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentTestCaseData.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="border-b border-gray-200 hover:bg-blue-50 transition-colors"
                          style={{ background: rowIndex % 2 === 0 ? '#f9fafb' : '#fff' }}
                        >
                          {Object.entries(row).map(([key, value], colIdx) => (
                            <td
                              key={key}
                              className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${colIdx === 0 ? 'font-bold text-blue-700' : ''}`}
                            >
                              {editingCell?.rowIndex === rowIndex && editingCell?.columnKey === key ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyPress={(e) => e.key === 'Enter' && handleCellSave()}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  autoFocus
                                />
                              ) : (
                                <div
                                  onClick={() => handleCellEdit(rowIndex, key, value)}
                                  className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                                >
                                  {value}
                                </div>
                              )}
                            </td>
                          ))}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <button
                              onClick={() => handleDeleteRow(rowIndex)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-3 bg-gray-50 border-t">
                  <button
                    onClick={handleAddRow}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Row
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Test Cases Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Test Cases"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Documents
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {documents.map((doc) => (
                <label key={doc.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDocuments.includes(doc.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDocuments([...selectedDocuments, doc.id]);
                      } else {
                        setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">{doc.fileName}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.templateName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Excel Template as Sample (Optional)
            </label>
            <select
              value={sampleTemplateId}
              onChange={e => handleSampleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">None</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.templateName}
                </option>
              ))}
            </select>
            {samplePreview && (
              <div className="mt-2 bg-gray-50 border rounded p-2 text-xs">
                {samplePreview.error ? (
                  <span className="text-red-600">{samplePreview.error}</span>
                ) : (
                  <>
                    <div className="font-semibold mb-1">Sample Preview:</div>
                    <table className="min-w-full text-xs border">
                      <thead>
                        <tr>
                          {samplePreview.headers.map((header, idx) => (
                            <th key={idx} className="border px-2 py-1">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(samplePreview.rows || []).filter(row => row && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')).map((row, ridx) => (
                          <tr key={ridx}>
                            {samplePreview.headers.map((_, cidx) => (
                              <td key={cidx} className="border px-2 py-1">{row[cidx]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Prompt (Optional)
            </label>
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add extra instructions or context for Gemini..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowGenerateModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={generatingTestCases}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateTestCases}
              disabled={selectedDocuments.length === 0 || !selectedTemplate || generatingTestCases}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {generatingTestCases ? 'Generating...' : 'Generate Test Cases'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modify Test Cases Modal */}
      <Modal
        isOpen={showModifyModal}
        onClose={() => setShowModifyModal(false)}
        title="Modify Test Cases with AI"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Natural Language Command
            </label>
            <textarea
              value={modifyCommand}
              onChange={(e) => setModifyCommand(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Add a test case for invalid login, Change step 3 of TC-001 to 'Click OK', Remove all test cases related to forgotten password"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowModifyModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={modifyingTestCases}
            >
              Cancel
            </button>
            <button
              onClick={handleModifyTestCases}
              disabled={!modifyCommand.trim() || modifyingTestCases}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {modifyingTestCases ? 'Modifying...' : 'Modify Test Cases'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectView; 