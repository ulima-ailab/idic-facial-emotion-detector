// Exported constants
export const API_URL = 'https://api.example.com';
export const MAX_RESULTS = 10;
export const EMOTION_COLLECTION = "Emotions";
export const CONTEXT_WEB_COLLECTION = "Context_web";
export const TEST_WEBAPP_COLLECTION = "Test_WebApp";

// Exported object properties
export const settings = {
  sendDataTime: 2400000, // num of milliseconds to send data to DB
  collectDataTime: 60000, // num of milliseconds to collect data in local
  numContinuousBlanks: 1   // num of times allowed old data when there is not a person detected
};
