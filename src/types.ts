/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SubjectResult {
  name: string;      // Arabic name of the subject
  key: string;       // Key identifier
  score: string | number; // Student score
  maxScore: number;  // Maximum score for this subject
}

export interface StudentResult {
  seatNumber: string;  // رقم الجلوس
  nationalId: string;  // الرقم القومي
  studentName: string; // اسم الطالب كاملا
  grade: '1' | '2';     // الصف الأول أو الثاني
  subjects: SubjectResult[];
  totalScore: number;
  maxTotal: number;
  percentage: number;
  status: 'passed' | 'failed' | 'unknown'; // ناجح / له ملحق
}

export interface WebAppConfig {
  sheetUrl: string; // Google Sheet URL
  webAppUrl: string; // Google Apps Script Web App URL
}
