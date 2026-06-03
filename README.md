# QuoteFlow
📋 QuoteFlow — คู่มือติดตั้งและใช้งาน

ระบบจัดการใบเสนอราคาและการเงิน
Frontend: GitHub Pages · Backend: Google Apps Script · Database: Google Sheets


🗺️ ภาพรวมระบบ
Browser (GitHub Pages)
    │
    │  POST /exec  (JSON)
    ▼
Google Apps Script (Web App)
    │
    │  read / write
    ▼
Google Sheets (Database)

✅ สิ่งที่ต้องมีก่อนเริ่ม
รายการลิงก์Google Account (Gmail)accounts.google.comGitHub Account (ฟรี)github.comBrowser: Chrome / Edge—

🔢 ขั้นตอนทั้งหมด (5 Steps)

STEP 1 — สร้าง Google Sheet (Database)
1.1 สร้าง Spreadsheet ใหม่

ไปที่ sheets.google.com
คลิก "+" Blank เพื่อสร้าง Sheet ใหม่
ตั้งชื่อไฟล์ว่า "QuoteFlow Database" (มุมซ้ายบน)

1.2 คัดลอก Spreadsheet ID
ดู URL ใน Browser จะมีรูปแบบแบบนี้:
https://docs.google.com/spreadsheets/d/  1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms  /edit
                                          ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
                                          นี่คือ Spreadsheet ID ของคุณ
คัดลอก ID ส่วนนี้ไว้ (จะใช้ใน Step 2)

⚠️ ระบบจะสร้าง Sheet tabs ต่างๆ ให้อัตโนมัติเมื่อมีการใช้งานครั้งแรก ไม่ต้องสร้างเอง


STEP 2 — Deploy Google Apps Script (Backend)
2.1 เปิด Apps Script

ใน Google Sheet ที่สร้างไว้ คลิกเมนู Extensions → Apps Script
หน้าต่าง Apps Script จะเปิดขึ้น

2.2 วางโค้ด Backend

ลบโค้ดเดิมทั้งหมดในหน้าต่าง (function myFunction() {})
เปิดไฟล์ Code.gs ที่ได้รับ
คัดลอกโค้ดทั้งหมด แล้ววางลงในช่อง Apps Script

2.3 แก้ไข Spreadsheet ID
หาบรรทัดนี้ในโค้ด (บรรทัดที่ 5):
javascriptconst SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
เปลี่ยนเป็น ID ที่ได้จาก Step 1.2:
javascriptconst SPREADSHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms';
2.4 บันทึกโค้ด
คลิกไอคอน 💾 หรือกด Ctrl+S (Windows) / Cmd+S (Mac)
2.5 Deploy เป็น Web App

คลิก "Deploy" (มุมขวาบน) → "New deployment"
คลิกไอคอน ⚙️ ข้าง "Select type" → เลือก "Web app"
ตั้งค่าดังนี้:

ตัวเลือกค่าที่เลือกDescriptionQuoteFlow API v1Execute asMe (your Gmail)Who has accessAnyone

คลิก "Deploy"
ระบบจะขอ Permission → คลิก "Authorize access"
เลือก Google Account ของคุณ
คลิก "Advanced" → "Go to QuoteFlow (unsafe)" → "Allow"

2.6 คัดลอก Web App URL
หลัง Deploy สำเร็จ จะมี URL ในรูปแบบ:
https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec
คัดลอก URL นี้ไว้ (จะใช้ใน Step 4)

STEP 3 — สร้าง Google OAuth Client ID (Login)
3.1 ไปที่ Google Cloud Console

เปิด console.cloud.google.com
Login ด้วย Gmail เดียวกับที่ใช้ทำ Apps Script

3.2 สร้าง Project ใหม่

คลิก "Select a project" (มุมซ้ายบน) → "New Project"
ตั้งชื่อ: "QuoteFlow"
คลิก "Create"
รอสักครู่ แล้วเลือก Project ที่สร้างใหม่

3.3 เปิดใช้งาน Google Identity API

ไปที่ APIs & Services → Library
ค้นหา "Google Identity"
คลิก "Google Identity Services API" → "Enable"

3.4 ตั้งค่า OAuth Consent Screen

ไปที่ APIs & Services → OAuth consent screen
เลือก "External" → คลิก "Create"
กรอกข้อมูล:

App name: QuoteFlow
User support email: (Gmail ของคุณ)
Developer contact: (Gmail ของคุณ)


คลิก "Save and Continue" จนถึงขั้นตอนสุดท้าย → "Back to Dashboard"

3.5 สร้าง OAuth Credentials

ไปที่ APIs & Services → Credentials
คลิก "+ Create Credentials" → "OAuth client ID"
ตั้งค่า:

Application type: Web application
Name: QuoteFlow Web


ในส่วน "Authorized JavaScript origins" คลิก "+ Add URI" แล้วใส่:

   https://USERNAME.github.io
แทน USERNAME ด้วย GitHub username ของคุณ เช่น:
   https://johnsmith.github.io

คลิก "Create"

3.6 คัดลอก Client ID
จะมี popup แสดง Client ID รูปแบบ:
123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
คัดลอก Client ID นี้ไว้ (จะใช้ใน Step 4)

STEP 4 — แก้ไขไฟล์โปรเจกต์
4.1 เปิดไฟล์ assets/app.js
หาบรรทัดนี้ในโค้ด (ด้านบนสุด):
javascriptconst CONFIG = {
  API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
};
แก้ไขเป็น URL และ Client ID ของคุณ:
javascriptconst CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbXXXXXXXXXXXXXX/exec',
  GOOGLE_CLIENT_ID: '123456789012-abcdef.apps.googleusercontent.com',
};
4.2 บันทึกไฟล์
กด Ctrl+S หรือบันทึกผ่าน Text Editor

STEP 5 — อัปโหลดขึ้น GitHub Pages
5.1 สร้าง GitHub Repository

ไปที่ github.com → Login
คลิก "+" มุมขวาบน → "New repository"
ตั้งค่า:

Repository name: quoteflow
Visibility: Public ✅ (ต้องเป็น Public สำหรับ GitHub Pages ฟรี)
✅ เช็ค "Add a README file"


คลิก "Create repository"

5.2 อัปโหลดไฟล์ทั้งหมด
วิธีที่ 1: ผ่าน Browser (ง่ายที่สุด)

ใน Repository ที่สร้าง คลิก "uploading an existing file"
ลากและวางไฟล์ทั้งหมดจากโฟลเดอร์ QuoteFlow:

   Code.gs
   index.html
   dashboard.html
   quotation.html
   active.html
   finance.html
   payroll.html
   receivable.html
   report.html
   assets/
     ├── style.css
     ├── app.js
     └── nav.js

⚠️ ต้องอัปโหลด ทั้งหมด รวมถึงโฟลเดอร์ assets/


เลื่อนลงล่าง → คลิก "Commit changes"

วิธีที่ 2: ผ่าน Git Command Line
bashgit clone https://github.com/USERNAME/quoteflow.git
cd quoteflow
# คัดลอกไฟล์ทั้งหมดลงในโฟลเดอร์นี้
git add .
git commit -m "Initial QuoteFlow deploy"
git push origin main
5.3 เปิดใช้งาน GitHub Pages

ใน Repository → คลิก "Settings" (tab บนสุด)
เลื่อนลงหา "Pages" ในเมนูซ้าย
ตั้งค่า Source:

Branch: main
Folder: / (root)


คลิก "Save"
รอประมาณ 1-3 นาที

5.4 เข้าใช้งาน
GitHub Pages URL จะเป็น:
https://USERNAME.github.io/quoteflow/
เช่น:
https://johnsmith.github.io/quoteflow/

🧪 ทดสอบระบบ
ตรวจสอบ Backend ก่อน
เปิด Browser แล้วไปที่ Web App URL:
https://script.google.com/macros/s/AKfycbXXXXXX/exec
ถ้าเห็นข้อความนี้ = Backend ทำงานปกติ ✅
json{"status": "QuoteFlow API running ✅"}
ทดสอบ Login

เปิด https://USERNAME.github.io/quoteflow/
คลิก "Sign in with Google"
เลือก Google Account
ถ้า Login สำเร็จ → จะเด้งไปหน้า Dashboard


🔴 การแก้ปัญหาที่พบบ่อย
❌ ปัญหา: กด Login แล้วไม่มีอะไรเกิดขึ้น
สาเหตุ: Client ID ผิด หรือ Authorized Origins ไม่ตรง
แก้ไข:

ตรวจสอบ Client ID ใน app.js ว่าถูกต้อง
ใน Google Cloud Console → ตรวจสอบว่า Authorized JavaScript origins ใส่ URL GitHub Pages ถูกต้อง เช่น https://johnsmith.github.io
URL ต้องไม่มี / ท้าย


❌ ปัญหา: Login ได้แต่บันทึกข้อมูลไม่ได้
สาเหตุ: Web App URL ผิด หรือ Apps Script ยังไม่ได้ Deploy
แก้ไข:

ตรวจสอบ API_URL ใน app.js
ลองเปิด URL นั้นใน Browser ตรงๆ ควรเห็น JSON response
ถ้าไม่เห็น → ไปที่ Apps Script → Deploy → Manage deployments → ตรวจสอบ URL


❌ ปัญหา: "This app isn't verified" เมื่อ Login
สาเหตุ: Google ยังไม่ verify app (ปกติสำหรับใช้งานส่วนตัว)
แก้ไข: คลิก "Advanced" → "Go to QuoteFlow (unsafe)" → "Allow"

สำหรับใช้งานส่วนตัวหรือภายในทีม ปลอดภัยแน่นอน


❌ ปัญหา: หน้าเว็บขึ้น 404
สาเหตุ: GitHub Pages ยังไม่ Deploy หรือชื่อไฟล์ผิด
แก้ไข:

รอ 3-5 นาที แล้วลอง Refresh
ตรวจสอบว่าไฟล์ index.html อยู่ที่ root ของ Repository (ไม่ใช่ใน subfolder)
ใน Settings → Pages ตรวจสอบว่า Source = main / root


❌ ปัญหา: ข้อมูลไม่แสดงใน Dashboard
สาเหตุ: Spreadsheet ID ผิด
แก้ไข:

เปิด Google Sheet → คัดลอก ID จาก URL ใหม่
แก้ไข SPREADSHEET_ID ใน Code.gs → Deploy ใหม่


❌ ปัญหา: Export PDF ไม่ได้
สาเหตุ: Browser บล็อก Popup
แก้ไข: คลิกที่ไอคอน popup blocked ใน address bar → Allow popups สำหรับ site นี้

🔄 การอัปเดตโค้ดในภายหลัง
อัปเดต Frontend (HTML/JS/CSS)
bash# แก้ไขไฟล์ที่ต้องการ แล้ว:
git add .
git commit -m "อัปเดต UI หน้า quotation"
git push origin main
# GitHub Pages จะ Deploy ใหม่อัตโนมัติ ใช้เวลา ~1 นาที
อัปเดต Backend (Apps Script)

ไปที่ Apps Script → แก้ไขโค้ด → บันทึก
คลิก Deploy → Manage deployments
คลิกไอคอน ✏️ (Edit)
Version → เลือก "New version"
คลิก "Deploy"


✅ URL เดิมยังใช้ได้ ไม่ต้องแก้ไข app.js


📊 โครงสร้าง Google Sheets (สร้างอัตโนมัติ)
Sheet Tabข้อมูลที่เก็บUsersEmail, ชื่อ, Role, วันที่สมัครQuotationsใบเสนอราคาทั้งหมดActiveOrdersOrder ที่กำลัง ActiveFinanceรายรับ-รายจ่ายPayrollค่าแรงพนักงาน/ช่างReceivablesยอดค้างชำระลูกค้า

🔒 ความปลอดภัย

ข้อมูลแต่ละ User แยกกันตาม Gmail (email-based isolation)
Google Apps Script ทำงานภายใต้ Google Account ของคุณ
ไม่มี Server ภายนอก ข้อมูลทั้งหมดอยู่ใน Google Drive ของคุณเอง
Login ผ่าน Google OAuth 2.0 มาตรฐาน


📞 สรุปข้อมูลที่ต้องเตรียม
รายการได้จากใส่ในSpreadsheet IDGoogle Sheets URLCode.gs บรรทัด 5Web App URLApps Script → Deployassets/app.js บรรทัด 3Google Client IDGoogle Cloud Consoleassets/app.js บรรทัด 4GitHub Usernamegithub.comAuthorized Origins + URL

QuoteFlow v1.0 · สร้างด้วย Google Apps Script + GitHub PagesProject contentQuoteFlowCreated by youAdd PDFs, documents, or other text to reference in this project.Content
