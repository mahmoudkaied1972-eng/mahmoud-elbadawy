/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StudentResult } from './types';

// The Google Apps Script that the user can copy into Extensions > Apps Script in Google Sheets
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * كود Google Apps Script لبوابة نتائج طلاب مدارس WE للتكنولوجيا التطبيقية فرع القليوبية
 * سكريبت مطور ديناميكياً للتعامل المرن مع هياكل الجداول ومعالجة أخطاء الصلاحيات ومطابقة الأرقام القومية بدقة.
 * 
 * طريقة التركيب والتشغيل:
 * 1. افتح ملف الـ Google Sheets الذي يضم درجات الطلاب وتأكد من أسماء التبويبات ("grade one" و "grade two").
 * 2. من الشريط العلوي بملف الإكسيل، اضغط على "Extensions" (الإضافات) ثم اختر "Apps Script".
 * 3. قم بمسح الرمز الافتراضي ولصق هذا الكود كاملاً بدلاً منه.
 * 4. يرجى الضغط على زر الحفظ (أيقونة القرص المرن) ثم اضغط على زر النشر (Deploy) -> اختر New deployment (نشر جديد).
 * 5. اضبط نوع النشر كـ Web App، واجعل Execute as: "Me" (أنا)، واجعل Who has access: "Anyone" (الجميع).
 * 6. اضغط Deploy ووافق على الأذونات والإقرارات من حساب جوجل الخاص بك.
 * 7. انسخ رابط الـ Web App URL المنتهي بـ "/exec" وقم بوضعه في نافذة التحكم وبوابة الموقع الذكي.
 */

function doGet(e) {
  var response = {
    status: "error",
    message: "لم يتم استقبال أي معايير للبحث"
  };
  
  try {
    if (!e || !e.parameter) {
      response.message = "لم يتم استقبال أي معايير للاستعلام. يرجى تمرير المعلمات عبر الطلب المباشر.";
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var grade = e.parameter.grade; // "1" أو "2"
    var nationalId = e.parameter.nationalId; // الرقم القومي المطلوب البحث عنه
    
    if (!grade || !nationalId) {
      response.message = "المعلمات المطلوبة ناقصة (برجاء التحقق من إدخال الصف الدراسي والرقم القومي)";
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var gStr = String(grade).trim();
    var idStr = String(nationalId).trim();
    
    var spreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadSheet) {
      response.message = "تعذر الوصول لملف الـ Google Sheet. يرجى تفعيل الكود من داخل ملف جدول البيانات (Extensions > Apps Script).";
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheets = spreadSheet.getSheets();
    if (sheets.length === 0) {
      response.message = "ملف الـ Google Sheets فارغ تماماً ولا يحتوي على أوراق درجات.";
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheet = null;
    var targetLabel = (gStr === "1" ? "الصف الأول" : "الصف الثاني");
    
    // البحث بذكاء تام عن اسم الورقة بمختلف السياقات المحتملة
    var defaultName = (gStr === "1") ? "grade one" : "grade two";
    sheet = spreadSheet.getSheetByName(defaultName);
    
    if (!sheet) {
      for (var k = 0; k < sheets.length; k++) {
        var nameLower = sheets[k].getName().toLowerCase().trim();
        var normalizedName = nameLower.replace(/[أإآا]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
        
        if (gStr === "1") {
          if (nameLower === "grade one" || nameLower === "grade 1" || nameLower === "grade_1" || 
              normalizedName.indexOf("اول") !== -1 || nameLower.indexOf("1") !== -1) {
            sheet = sheets[k];
            break;
          }
        } else {
          if (nameLower === "grade two" || nameLower === "grade 2" || nameLower === "grade_2" || 
              normalizedName.indexOf("ثاني") !== -1 || normalizedName.indexOf("ثانى") !== -1 || 
              nameLower.indexOf("2") !== -1) {
            sheet = sheets[k];
            break;
          }
        }
      }
    }
    
    // استخدام الترتيب في حال عدم تطابق الأسماء
    if (!sheet) {
      if (gStr === "1") {
        sheet = sheets[0];
      } else {
        sheet = sheets.length > 1 ? sheets[1] : sheets[0];
      }
    }
    
    var data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) {
      response.status = "not_found";
      response.message = "جدول البيانات المسمى '" + sheet.getName() + "' فارغ أو لا يحتوي على درجات الطلاب.";
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // الصف الأول يحتوي على أسماء الأعمدة (العناوين)
    var headers = data[0].map(function(h) { return h.toString().trim(); });
    
    // دالة مساعدة لتطهير الأرقام القومية والتخلص من الفواصل العشرية الناتجة عن تنسيق الإكسيل (مثل .0) ومنع الاختلافات
    function getCleanDigits(valStr) {
      if (!valStr) return "";
      var s = valStr.toString().trim();
      if (s.indexOf('.') !== -1) {
        s = s.split('.')[0]; // أخذ ما قبل العلامة العشرية مباشرة
      }
      return s.replace(/\\D/g, ""); // إبقاء الأرقام فقط
    }
    
    // دالة لتطبيع الحروف العربية لتجنب الاختلافات الإملائية
    function normalizeArabic(str) {
      if (!str) return "";
      return str.toString().toLowerCase()
        .replace(/[أإآا]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/\\s/g, ""); // إزالة المسافات أيضاً لمطابقة مثالية
    }
    
    // البحث الديناميكي عن عمود الرقم القومي بطريقة مرنة للغاية
    var idIndex = -1;
    for (var col = 0; col < headers.length; col++) {
      var normHeader = normalizeArabic(headers[col]);
      if (normHeader.indexOf("الرقم القومي") !== -1 || 
          normHeader.indexOf("رقم قومي") !== -1 || 
          normHeader.indexOf("القومي") !== -1 || 
          normHeader.indexOf("nationalid") !== -1 || 
          normHeader.indexOf("nid") !== -1) {
        idIndex = col;
        break;
      }
    }
    // في حال تعذر العثور على العنوان، نعتمد على عمود "ب" (العمود الثاني بـ index 1)
    if (idIndex === -1) {
      idIndex = headers.length > 1 ? 1 : 0;
    }
    
    // البحث ومطابقة الرقم القومي المدخل بالخلفية
    var foundRow = null;
    var targetCleanId = getCleanDigits(idStr);
    
    for (var i = 1; i < data.length; i++) {
      var rowVal = data[i][idIndex] ? data[i][idIndex].toString() : "";
      var rowCleanId = getCleanDigits(rowVal);
      if (rowCleanId && rowCleanId === targetCleanId) {
        foundRow = data[i];
        break;
      }
    }
    
    if (!foundRow) {
      response.status = "not_found";
      response.message = "لم يتم العثور على نتائج للرقم القومي: (" + idStr + ") في جدول درجات " + targetLabel + ". يرجى التحقق من نقله بدقة وبدون فراغات إضافية.";
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // البحث الديناميكي السهل عن رقم الجلوس
    var seatNumIndex = -1;
    for (var col = 0; col < headers.length; col++) {
      var normHeader = normalizeArabic(headers[col]);
      if (normHeader.indexOf("جلوس") !== -1 || normHeader.indexOf("رقم الجلوس") !== -1 || normHeader.indexOf("seat") !== -1) {
        seatNumIndex = col;
        break;
      }
    }
    if (seatNumIndex === -1) seatNumIndex = 0; // افتراضياً العمود الأول
    
    // البحث الديناميكي السهل عن اسم الطالب كاملا
    var nameIndex = -1;
    for (var col = 0; col < headers.length; col++) {
      var normHeader = normalizeArabic(headers[col]);
      if (normHeader.indexOf("اسم الطالب") !== -1 || normHeader.indexOf("كامل") !== -1 || normHeader.indexOf("الاسم") !== -1 || normHeader.indexOf("name") !== -1) {
        nameIndex = col;
        break;
      }
    }
    if (nameIndex === -1) nameIndex = Math.min(2, headers.length - 1); // افتراضياً العمود الثالث
    
    var seatNumber = foundRow[seatNumIndex] ? foundRow[seatNumIndex].toString() : "";
    var studentName = foundRow[nameIndex] ? foundRow[nameIndex].toString() : "";
    
    // تحديد قائمة المواد والحد الأقصى لكل منها بحسب الصف لضمان توافق الحساب التراكمي
    var subjectKeys = [];
    if (gStr === "1") {
      subjectKeys = [
        { name: "اللغة العربية", max: 50 },
        { name: "Advanced English", max: 50 },
        { name: "Advanced Physics", max: 50 },
        { name: "Advanced Mathematics", max: 50 },
        { name: "الدراسات التخصصية (نظري)", max: 100 },
        { name: "الدراسات التخصصية (عملي)", max: 100 },
        { name: "التدريب الميداني", max: 100 },
        { name: "التربية الوطنية", max: 50 },
        { name: "التربية الدينية", max: 50 }
      ];
    } else {
      subjectKeys = [
        { name: "اللغة العربية", max: 50 },
        { name: "Advanced English", max: 50 },
        { name: "Advanced Mathematics", max: 50 },
        { name: "Advanced Physics", max: 50 },
        { name: "الدراسات الاجتماعية", max: 50 },
        { name: "الدراسات التخصصية (نظري)", max: 100 },
        { name: "الدراسات التخصصية (عملي)", max: 100 },
        { name: "التدريب الميداني", max: 100 },
        { name: "التربية الدينية", max: 50 }
      ];
    }
    
    var subjects = [];
    var totalScore = 0;
    var maxTotal = 0;
    var failedAny = false;
    
    for (var s = 0; s < subjectKeys.length; s++) {
      var subInfo = subjectKeys[s];
      var colIdx = -1;
      var normSubName = normalizeArabic(subInfo.name);
      
      // مطابقة ديناميكية لأسماء الأعمدة
      for (var col = 0; col < headers.length; col++) {
        var normHeader = normalizeArabic(headers[col]);
        if (normHeader === normSubName || normHeader.indexOf(normSubName) !== -1 || normSubName.indexOf(normHeader) !== -1) {
          colIdx = col;
          break;
        }
      }
      
      // مطابقة احتياطية مرنة لأسماء أو اختصارات باللغة الإنجليزية والعربية
      if (colIdx === -1) {
        if (subInfo.name === "Advanced English") {
          colIdx = headers.findIndex(function(h) { 
            var t = normalizeArabic(h); 
            return t.indexOf("english") !== -1 || t.indexOf("انجليزي") !== -1 || t.indexOf("إنجليزي") !== -1 || t.indexOf("انجليزى") !== -1; 
          });
        } else if (subInfo.name === "Advanced Mathematics") {
          colIdx = headers.findIndex(function(h) { 
            var t = normalizeArabic(h); 
            return t.indexOf("math") !== -1 || t.indexOf("رياضيات") !== -1 || t.indexOf("رياضه") !== -1; 
          });
        } else if (subInfo.name === "Advanced Physics") {
          colIdx = headers.findIndex(function(h) { 
            var t = normalizeArabic(h); 
            return t.indexOf("phys") !== -1 || t.indexOf("فيزياء") !== -1 || t.indexOf("فيزيا") !== -1; 
          });
        } else if (subInfo.name === "الدراسات التخصصية (نظري)") {
          colIdx = headers.findIndex(function(h) { 
            var t = normalizeArabic(h); 
            return t.indexOf("نظري") !== -1 || (t.indexOf("تخصصيه") !== -1 && t.indexOf("نظري") !== -1); 
          });
        } else if (subInfo.name === "الدراسات التخصصية (عملي)") {
          colIdx = headers.findIndex(function(h) { 
            var t = normalizeArabic(h); 
            return t.indexOf("عملي") !== -1 || (t.indexOf("تخصصيه") !== -1 && t.indexOf("عملي") !== -1); 
          });
        }
      }
      
      if (colIdx !== -1) {
        var val = foundRow[colIdx];
        var scoreNum = parseFloat(val);
        
        if (isNaN(scoreNum)) {
          scoreNum = val ? val.toString().trim() : "-";
        } else {
          scoreNum = Math.round(scoreNum * 100) / 100;
        }
        
        subjects.push({
          name: subInfo.name,
          key: subInfo.name,
          score: scoreNum,
          maxScore: subInfo.max
        });
        
        // التربية الدينية والتربية الوطنية لا تضاف للمجموع المادي الكلي في النهاية
        var isExcludedFromTotal = subInfo.name === "التربية الدينية" || subInfo.name === "التربية الوطنية";
        
        if (!isNaN(parseFloat(scoreNum))) {
          if (!isExcludedFromTotal) {
            totalScore += parseFloat(scoreNum);
            maxTotal += subInfo.max;
          }
          // رسوب في حال الحصول على أقل من 50% من الدرجة العظمى للمادة
          if (parseFloat(scoreNum) < (subInfo.max / 2)) {
            failedAny = true;
          }
        }
      }
    }
    
    var percentage = maxTotal > 0 ? (totalScore / maxTotal) * 100 : 0;
    
    response = {
      status: "success",
      data: {
        seatNumber: seatNumber,
        nationalId: idStr,
        studentName: studentName,
        grade: gStr,
        subjects: subjects,
        totalScore: Math.round(totalScore * 100) / 100,
        maxTotal: maxTotal,
        percentage: Math.round(percentage * 100) / 100,
        status: failedAny ? "failed" : "passed"
      }
    };
    
  } catch (err) {
    response.status = "error";
    response.message = "حدث خطأ برمجي مع جدول البيانات: " + err.toString();
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

// Build realistic data matches the screenshots for mock demonstration
export const MOCK_STUDENTS: StudentResult[] = [
  // Grade One (الصف الأول) from sheet screenshot
  {
    seatNumber: "1001",
    nationalId: "30910141403371",
    studentName: "احمد اشرف الهادى منصور",
    grade: "1",
    subjects: [
      { name: "اللغة العربية", key: "اللغة العربية", score: 44, maxScore: 50 },
      { name: "Advanced English", key: "Advanced English", score: 42, maxScore: 50 },
      { name: "Advanced Physics", key: "Advanced Physics", score: 41, maxScore: 50 },
      { name: "Advanced Mathematics", key: "Advanced Mathematics", score: 47, maxScore: 50 },
      { name: "الدراسات التخصصية (نظري)", key: "الدراسات التخصصية (نظري)", score: 88, maxScore: 100 },
      { name: "الدراسات التخصصية (عملي)", key: "الدراسات التخصصية (عملي)", score: 78, maxScore: 100 },
      { name: "التدريب الميداني", key: "التدريب الميداني", score: 99, maxScore: 100 },
      { name: "التربية الوطنية", key: "التربية الوطنية", score: 44, maxScore: 50 },
      { name: "التربية الدينية", key: "التربية الدينية", score: 44, maxScore: 50 }
    ],
    totalScore: 439, // Subtotal excluding non-added subjects Arab, Eng, Phy, Math, Theory, Practical, Field = 44+42+41+47+88+78+99 = 439
    maxTotal: 500, // Total maximum = 50 + 50 + 50 + 50 + 100 + 100 + 100 = 500
    percentage: 87.8,
    status: "passed"
  },
  {
    seatNumber: "1002",
    nationalId: "30912081403272",
    studentName: "احمد سيد سيد قاسم",
    grade: "1",
    subjects: [
      { name: "اللغة العربية", key: "اللغة العربية", score: 38, maxScore: 50 },
      { name: "Advanced English", key: "Advanced English", score: 35, maxScore: 50 },
      { name: "Advanced Physics", key: "Advanced Physics", score: 34, maxScore: 50 },
      { name: "Advanced Mathematics", key: "Advanced Mathematics", score: 40, maxScore: 50 },
      { name: "الدراسات التخصصية (نظري)", key: "الدراسات التخصصية (نظري)", score: 82, maxScore: 100 },
      { name: "الدراسات التخصصية (عملي)", key: "الدراسات التخصصية (عملي)", score: 80, maxScore: 100 },
      { name: "التدريب الميداني", key: "التدريب الميداني", score: 85, maxScore: 100 },
      { name: "التربية الوطنية", key: "التربية الوطنية", score: 35, maxScore: 50 },
      { name: "التربية الدينية", key: "التربية الدينية", score: 40, maxScore: 50 }
    ],
    totalScore: 394,
    maxTotal: 500,
    percentage: 78.8,
    status: "passed"
  },
  {
    seatNumber: "1003",
    nationalId: "31008241402435",
    studentName: "احمد محمد رشاد عبد المؤمن بحالو",
    grade: "1",
    subjects: [
      { name: "اللغة العربية", key: "اللغة العربية", score: 41, maxScore: 50 },
      { name: "Advanced English", key: "Advanced English", score: 45, maxScore: 50 },
      { name: "Advanced Physics", key: "Advanced Physics", score: 43, maxScore: 50 },
      { name: "Advanced Mathematics", key: "Advanced Mathematics", score: 44, maxScore: 50 },
      { name: "الدراسات التخصصية (نظري)", key: "الدراسات التخصصية (نظري)", score: 90, maxScore: 100 },
      { name: "الدراسات التخصصية (عملي)", key: "الدراسات التخصصية (عملي)", score: 85, maxScore: 100 },
      { name: "التدريب الميداني", key: "التدريب الميداني", score: 98, maxScore: 100 },
      { name: "التربية الوطنية", key: "التربية الوطنية", score: 42, maxScore: 50 },
      { name: "التربية الدينية", key: "التربية الدينية", score: 45, maxScore: 50 }
    ],
    totalScore: 446,
    maxTotal: 500,
    percentage: 89.2,
    status: "passed"
  },
  {
    seatNumber: "1004",
    nationalId: "31006121402331",
    studentName: "احمد محمد عبد الغفار محمد محمود",
    grade: "1",
    subjects: [
      { name: "اللغة العربية", key: "اللغة العربية", score: 32, maxScore: 50 },
      { name: "Advanced English", key: "Advanced English", score: 30, maxScore: 50 },
      { name: "Advanced Physics", key: "Advanced Physics", score: 28, maxScore: 50 },
      { name: "Advanced Mathematics", key: "Advanced Mathematics", score: 31, maxScore: 50 },
      { name: "الدراسات التخصصية (نظري)", key: "الدراسات التخصصية (نظري)", score: 72, maxScore: 100 },
      { name: "الدراسات التخصصية (عملي)", key: "الدراسات التخصصية (عملي)", score: 70, maxScore: 100 },
      { name: "التدريب الميداني", key: "التدريب الميداني", score: 80, maxScore: 100 },
      { name: "التربية الوطنية", key: "التربية الوطنية", score: 28, maxScore: 50 },
      { name: "التربية الدينية", key: "التربية الدينية", score: 35, maxScore: 50 }
    ],
    totalScore: 343,
    maxTotal: 500,
    percentage: 68.6,
    status: "passed"
  },
  {
    seatNumber: "1005",
    nationalId: "31002081401552",
    studentName: "احمد نجم ابراهيم عبد المؤمن ابراهيم",
    grade: "1",
    subjects: [
      { name: "اللغة العربية", key: "اللغة العربية", score: 48, maxScore: 50 },
      { name: "Advanced English", key: "Advanced English", score: 49, maxScore: 50 },
      { name: "Advanced Physics", key: "Advanced Physics", score: 46, maxScore: 50 },
      { name: "Advanced Mathematics", key: "Advanced Mathematics", score: 48, maxScore: 50 },
      { name: "الدراسات التخصصية (نظري)", key: "الدراسات التخصصية (نظري)", score: 95, maxScore: 100 },
      { name: "الدراسات التخصصية (عملي)", key: "الدراسات التخصصية (عملي)", score: 95, maxScore: 100 },
      { name: "التدريب الميداني", key: "التدريب الميداني", score: 99, maxScore: 100 },
      { name: "التربية الوطنية", key: "التربية الوطنية", score: 45, maxScore: 50 },
      { name: "التربية الدينية", key: "التربية الدينية", score: 47, maxScore: 50 }
    ],
    totalScore: 480,
    maxTotal: 500,
    percentage: 96,
    status: "passed"
  },
  
  // Grade Two (الصف الثاني) from sheet screenshot
  {
    seatNumber: "222",
    nationalId: "776655443",
    studentName: "وليد سامي",
    grade: "2",
    subjects: [
      { name: "اللغة العربية", key: "اللغة العربية", score: 25, maxScore: 50 },
      { name: "Advanced English", key: "Advanced English", score: 25, maxScore: 50 },
      { name: "Advanced Mathematics", key: "Advanced Mathematics", score: 25, maxScore: 50 },
      { name: "Advanced Physics", key: "Advanced Physics", score: 20, maxScore: 50 }, // Failed, min is 25
      { name: "الدراسات الاجتماعية", key: "الدراسات الاجتماعية", score: 10, maxScore: 50 }, // Failed, min is 25
      { name: "الدراسات التخصصية (نظري)", key: "الدراسات التخصصية (نظري)", score: 65, maxScore: 100 },
      { name: "الدراسات التخصصية (عملي)", key: "الدراسات التخصصية (عملي)", score: 65, maxScore: 100 },
      { name: "التدريب الميداني", key: "التدريب الميداني", score: 50, maxScore: 100 },
      { name: "التربية الدينية", key: "التربية الدينية", score: 10, maxScore: 50 } // Failed, min is 25
    ],
    totalScore: 285, // Excluding non-added religion: Arab, Eng, Math, Phy, Soc, Theory, Prac, Field = 25+25+25+20+10+65+65+50 = 285
    maxTotal: 500, // Total maximum = 50 + 50 + 50 + 50 + 50 + 100 + 100 + 100 = 500
    percentage: 57,
    status: "failed" // failed since it contains subjects below 50%
  },
  {
    seatNumber: "1025",
    nationalId: "31003050105544",
    studentName: "حبيبة احمد عبد الله سعد",
    grade: "2",
    subjects: [
      { name: "اللغة العربية", key: "اللغة العربية", score: 42, maxScore: 50 },
      { name: "Advanced English", key: "Advanced English", score: 44, maxScore: 50 },
      { name: "Advanced Mathematics", key: "Advanced Mathematics", score: 40, maxScore: 50 },
      { name: "Advanced Physics", key: "Advanced Physics", score: 41, maxScore: 50 },
      { name: "الدراسات الاجتماعية", key: "الدراسات الاجتماعية", score: 38, maxScore: 50 },
      { name: "الدراسات التخصصية (نظري)", key: "الدراسات التخصصية (نظري)", score: 85, maxScore: 100 },
      { name: "الدراسات التخصصية (عملي)", key: "الدراسات التخصصية (عملي)", score: 88, maxScore: 100 },
      { name: "التدريب الميداني", key: "التدريب الميداني", score: 94, maxScore: 100 },
      { name: "التربية الدينية", key: "التربية الدينية", score: 42, maxScore: 50 }
    ],
    totalScore: 432,
    maxTotal: 500,
    percentage: 86.4,
    status: "passed"
  }
];
