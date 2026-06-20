/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { MOCK_STUDENTS } from "./src/data.ts";

const app = express();
const PORT = 3000;

app.use(express.json());

// API route logic
app.get("/api/config", (req, res) => {
  const configPath = path.join(process.cwd(), "sheet_config.json");
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      return res.json(JSON.parse(raw));
    } catch (err) {
      return res.json({ sheetUrl: "", webAppUrl: "" });
    }
  }
  return res.json({ sheetUrl: "", webAppUrl: "" });
});

app.post("/api/config", (req, res) => {
  const { sheetUrl, webAppUrl } = req.body;
  const configPath = path.join(process.cwd(), "sheet_config.json");
  try {
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          sheetUrl: sheetUrl || "",
          webAppUrl: webAppUrl || "",
        },
        null,
        2
      ),
      "utf-8"
    );
    return res.json({ status: "success", message: "تم حفظ الإعدادات بنجاح" });
  } catch (err: any) {
    return res.status(500).json({
      status: "error",
      message: err.message || "خطأ أثناء حفظ الإعدادات",
    });
  }
});

app.get("/api/search", async (req, res) => {
  const { grade, nationalId } = req.query;
  if (!grade || !nationalId) {
    return res.status(400).json({ status: "error", message: "بيانات البحث ناقصة" });
  }

  const gStr = String(grade).trim();
  const idStr = String(nationalId).trim();

  // Determine Google Sheets Web App URL: either via direct server environment variable (preferred) or sheet_config.json
  let webAppUrl = process.env.GOOGLE_APPS_SCRIPT_URL || "";
  if (!webAppUrl) {
    const configPath = path.join(process.cwd(), "sheet_config.json");
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(raw);
        webAppUrl = parsed.webAppUrl || "";
      } catch (e) {}
    }
  }

  if (webAppUrl) {
    // Check if the user pasted a google sheets link instead of apps script URL
    if (webAppUrl.includes("docs.google.com/spreadsheets")) {
      return res.status(400).json({
        status: "error",
        message: "عذراً، لقد قمت بلصق رابط ملف الـ Google Sheets في خانة 'رابط تطبيق الويب المجمع (App Script URL)'. يرجى بدلاً من ذلك قراءة التعليمات والضغط على النشر (Deploy) من داخل Apps Script ونسخ رابط التطبيق البرمائي الفعلي المنتهي بـ '/exec'."
      });
    }

    // Check if they pasted a developer /dev link which always requires google sign-in/login
    if (webAppUrl.trim().endsWith("/dev") || webAppUrl.includes("/dev?")) {
      return res.status(400).json({
        status: "error",
        message: "خطأ في رابط Apps Script المنسوخ: لقد قمت بلصق رابط اختبار المطور المنتهي بـ '/dev' وهو رابط خاص بك ومقيد من جوجل ويطلب دائما تسجيل الدخول. يرجى الضغط على زر النشر (New Deployment) ونسخ الرابط الفعلي المنتهي بـ '/exec' ليتوافق مع بوابة النتائج للجميع."
      });
    }

    try {
      const targetUrl = `${webAppUrl}?grade=${encodeURIComponent(gStr)}&nationalId=${encodeURIComponent(idStr)}`;
      const response = await fetch(targetUrl);
      if (response.ok) {
        const text = await response.text();
        let json: any;
        try {
          json = JSON.parse(text);
        } catch (parseErr: any) {
          console.error("Failed to parse Google Apps Script response as JSON. Raw snippet:", text.substring(0, 300));
          
          // 1. Check for Login / Authorization page
          const hasLoginHint = text.includes("Sign in") || 
                               text.includes("accounts.google.com") || 
                               text.includes("ServiceLogin") ||
                               text.includes("login") ||
                               text.includes("<!DOCTYPE");
                               
          if (hasLoginHint) {
            return res.status(500).json({
              status: "error",
              message: "خطأ في صلاحيات الـ Web App بجوجل: يطالب الـ Web App بتسجيل الدخول لجوجل. يرجى مراجعة إعدادات النشر (Deploy) في Apps Script والتأكد من ضبط 'Who has access' على 'Anyone' (الجميع)، والأهم هو التأكد من أنك قمت بنسخ الرابط المنشور المنتهي بـ '/exec' وليس رابط التطوير المنتهي بـ '/dev'، وتعديل هذا الرابط في الإعدادات هنا."
            });
          }

          // 2. Extract specific Apps Script runtime/compilation error message
          // Google script errors generally render inside an element with class "errorMessage" or similar
          const errorMsgMatch = text.match(/class=["']errorMessage["'][^>]*>([\s\S]*?)<\/div>/i) ||
                                text.match(/id=["']error-message["'][^>]*>([\s\S]*?)<\/div>/i);
          if (errorMsgMatch && errorMsgMatch[1]) {
            const extractedError = errorMsgMatch[1].replace(/<[^>]*>/g, "").trim();
            return res.status(500).json({
              status: "error",
              message: `خطأ برمجي في الـ Web App الخاص بك بجوجل: "${extractedError}". يرجى فتح محرر الأكواد في Google Sheets والتأكد من نسخ الكود كاملاً دون نقصان، والضغط على زر حفظ ثم نشر إصدار جديد.`
            });
          }

          // 3. Fallback generic error
          return res.status(500).json({
            status: "error",
            message: "الرابط المدخل لا يعود ببيانات صالحة من جوجل شيت. يرجى التأكد من أنك قمت بحفظ الكود البرمجي ونشره بشكل صحيح كإصدار جديد (New Deployment) وبأنه ينتهي بـ /exec."
          });
        }

        if (json && json.status === "success") {
          return res.json(json);
        } else if (json && json.status === "not_found") {
          return res.json({
            status: "not_found",
            message: "لم يتم العثور على طالب مطابق للرقم القومي المدخل في الصف المختار. يرجى التأكد من كتابة الرقم القومي المكون من 14 رقماً بشكل صحيح ومطابق لبيانات شيت المدرسة."
          });
        } else {
          return res.status(500).json({
            status: "error",
            message: json.message || "حدث خطأ غير معروف في الـ Apps Script الخاص بجدول البيانات."
          });
        }
      } else {
        return res.status(500).json({
          status: "error",
          message: `عذراً، فشل الاتصال بخادم النتائج حالياً. استجابة خاطئة من خادم جوجل شيت: ${response.status}`
        });
      }
    } catch (err: any) {
      console.error("Sheet API invocation failed:", err.message);
      return res.status(500).json({
        status: "error",
        message: `تعذر الاتصال بقاعدة البيانات حالياً (${err.message}). يرجى مراجعة إدارة المدرسة وإصلاح رابط التطبيق البرمجي للـ Google Sheet.`
      });
    }
  } else {
    return res.status(503).json({
      status: "error",
      message: "عذراً، بوابة النتائج لم يتم تهيئتها للاتصال الحقيقي حالياً. يرجى من مدير النظام تزويد الخادم برابط تطبيق وجدول بيانات Google Sheet بالانتقال لرابط الإعدادات السري لتفعيل عمل البوابة."
    });
  }
});

// Vite middleware configuration
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server currently running on http://localhost:${PORT}`);
  });
}

start();
