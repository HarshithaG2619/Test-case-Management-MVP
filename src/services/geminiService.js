import { GoogleGenerativeAI } from '@google/generative-ai';

console.log('Gemini API Key:', process.env.REACT_APP_GEMINI_API_KEY);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY || 'your-gemini-api-key');

/**
 * Generate test cases from documents and template
 * @param {Array} documentContents - Array of extracted document contents
 * @param {Array} templateHeaders - Array of column headers from template
 * @param {string} sampleSection - Sample section to include in the prompt
 * @param {string} customPrompt - Additional instructions or context for the prompt
 * @returns {Promise<Array>} Generated test cases
 */
export const generateTestCases = async (documentContents, templateHeaders, sampleSection = '', customPrompt = '') => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Sample test case for context
    const sampleTestCase = `{
  "Test Case ID": "TC-001",
  "Title": "Login with valid credentials",
  "Steps": "1. Go to login page. 2. Enter valid username and password. 3. Click Login.",
  "Expected Result": "User is logged in and redirected to the dashboard."
}`;

    const prompt = `Based on the following documentation:

${documentContents.join('\n\n')}

And using the following Excel column headers for test cases: ${templateHeaders.join(', ')}.
${sampleSection}
${customPrompt ? `\nAdditional instructions:\n${customPrompt}` : ''}

Here is a sample test case for reference:
${sampleTestCase}

Generate a list of comprehensive software test cases. Each test case should be a JSON object with keys matching the provided headers. Return the entire list as a JSON array.

Focus on:
- Functional testing scenarios
- Edge cases and error conditions
- User workflow testing
- Data validation testing

Ensure each test case is detailed and actionable.

**Return only a valid JSON array, with no extra text, comments, or formatting.**`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        // responseMimeType: "application/json",  // Removed as it might not be supported by all models/versions
        // responseSchema: { ... } // Removed
      }
    });

    const response = await result.response;
    let text = response.text();
    // Remove Markdown code block if present
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    // Fallback: extract first JSON array from the response
    const match = text.match(/\[.*\]/s);
    if (match) text = match[0];
    // Attempt to fix common JSON issues
    // Remove trailing commas before ] or }
    text = text.replace(/,\s*([}\]])/g, '$1');
    // Try to close unterminated brackets (very basic)
    if ((text.match(/\[/g) || []).length > (text.match(/\]/g) || []).length) text += ']';
    if ((text.match(/\{/g) || []).length > (text.match(/\}/g) || []).length) text += '}';
    try {
      const testCases = JSON.parse(text);
      return Array.isArray(testCases) ? testCases : [testCases];
    } catch (err) {
      // Show the raw output for debugging
      console.error('Gemini raw output:', text);
      throw new Error('Failed to parse Gemini output as JSON. See console for raw output.');
    }
  } catch (error) {
    console.error('Error generating test cases:', error);
    throw new Error('Failed to generate test cases. Please try again.');
  }
};

/**
 * Modify test cases using natural language commands
 * @param {Array} currentTestCases - Current test case data
 * @param {string} userCommand - Natural language command from user
 * @returns {Promise<Array>} Modified test cases
 */
export const modifyTestCases = async (currentTestCases, userCommand) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Here are the current test cases in JSON format:
${JSON.stringify(currentTestCases, null, 2)}

The user wants to make the following modification: "${userCommand}"

Please return the updated list of test cases in the same JSON array format. 
- If adding new test cases, ensure they follow the same structure
- If modifying existing test cases, preserve the original structure
- If deleting test cases, remove them from the array
- Maintain the same column headers and data types`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        // responseMimeType: "application/json", // Removed
        // responseSchema: { ... } // Removed
      }
    });

    const response = await result.response;
    let text = response.text();
    // Remove Markdown code block if present
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    
    // Parse the JSON response
    const modifiedTestCases = JSON.parse(text);
    return Array.isArray(modifiedTestCases) ? modifiedTestCases : [modifiedTestCases];
  } catch (error) {
    console.error('Error modifying test cases:', error);
    throw new Error('Failed to modify test cases. Please try again.');
  }
}; 