import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Request a signed upload URL from the backend
 * @param {string} fileName - Path/name for the file in GCS
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} Signed upload URL
 */
export const getUploadUrl = async (fileName, contentType) => {
  const res = await fetch('http://localhost:4000/generate-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, contentType }),
  });
  if (!res.ok) throw new Error('Failed to get upload URL');
  const { url } = await res.json();
  return url;
};

/**
 * Upload a file to GCS using a signed URL
 * @param {string} url - Signed upload URL
 * @param {File} file - File to upload
 * @returns {Promise<void>}
 */
export const uploadFileToGCS = async (url, file) => {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error('Failed to upload file to GCS');
};

/**
 * Request a signed download URL from the backend
 * @param {string} fileName - Path/name for the file in GCS
 * @returns {Promise<string>} Signed download URL
 */
export const getDownloadUrl = async (fileName) => {
  const res = await fetch('http://localhost:4000/generate-download-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName }),
  });
  if (!res.ok) throw new Error('Failed to get download URL');
  const { url } = await res.json();
  return url;
};

/**
 * Download a file from GCS using a signed URL
 * @param {string} fileName - Path/name for the file in GCS
 * @param {string} downloadName - Name for the downloaded file
 */
export const downloadFile = async (fileName, downloadName) => {
  const url = await getDownloadUrl(fileName);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Save file metadata to Firestore via backend
 * @param {string} collection - Firestore collection name
 * @param {object} data - Metadata object
 * @returns {Promise<string>} Document ID
 */
export const saveFileMetadata = async (collection, data) => {
  const res = await fetch('http://localhost:4000/save-metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection, data }),
  });
  if (!res.ok) throw new Error('Failed to save metadata');
  const { id } = await res.json();
  return id;
};

/**
 * Extract text content from PDF file
 * @param {File} file - PDF file
 * @returns {Promise<string>} Extracted text content
 */
export const extractPDFContent = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    throw new Error('Failed to extract PDF content. Please try again.');
  }
};

/**
 * Extract text content from DOCX file
 * @param {File} file - DOCX file
 * @returns {Promise<string>} Extracted text content
 */
export const extractDOCXContent = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting DOCX content:', error);
    throw new Error('Failed to extract DOCX content. Please try again.');
  }
};

/**
 * Extract text content from TXT file
 * @param {File} file - TXT file
 * @returns {Promise<string>} Extracted text content
 */
export const extractTXTContent = async (file) => {
  try {
    return await file.text();
  } catch (error) {
    console.error('Error extracting TXT content:', error);
    throw new Error('Failed to extract TXT content. Please try again.');
  }
};

/**
 * Extract headers from Excel file
 * @param {File} file - Excel file
 * @returns {Promise<Array<string>>} Array of column headers
 */
export const extractExcelHeaders = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get the first row as headers
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const headers = [];
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = worksheet[cellAddress];
      headers.push(cell ? cell.v : `Column ${col + 1}`);
    }
    
    return headers;
  } catch (error) {
    console.error('Error extracting Excel headers:', error);
    throw new Error('Failed to extract Excel headers. Please try again.');
  }
};

/**
 * Extract content from file based on file type
 * @param {File} file - File to extract content from
 * @returns {Promise<string>} Extracted content
 */
export const extractFileContent = async (file) => {
  const fileType = file.name.toLowerCase();
  
  if (fileType.endsWith('.pdf')) {
    return await extractPDFContent(file);
  } else if (fileType.endsWith('.docx')) {
    return await extractDOCXContent(file);
  } else if (fileType.endsWith('.txt')) {
    return await extractTXTContent(file);
  } else if (fileType.endsWith('.xlsx') || fileType.endsWith('.csv')) {
    // Skip content extraction for Excel/CSV, just return empty string
    return '';
  } else {
    throw new Error('Unsupported file type for content extraction.');
  }
};

/**
 * Generate Excel file from test case data
 * @param {Array} testCases - Test case data
 * @param {Array} headers - Column headers
 * @param {string} fileName - Name for the Excel file
 */
export const generateExcelFile = (testCases, headers, fileName) => {
  try {
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(testCases, { header: headers });
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cases');
    
    // Generate Excel file
    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    console.error('Error generating Excel file:', error);
    throw new Error('Failed to generate Excel file. Please try again.');
  }
}; 